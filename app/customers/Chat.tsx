"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { FIREBASE_Db, FIREBASE_Storage } from "@/FirebaseConfig";
import {
  collection,
  addDoc,
  query,
  orderBy,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ChevronLeft, Download, ImagePlus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar";

type Message = {
  id: string;
  text: string;
  senderId: string;
  receiverId: string;
  email: string;
  createdAt: Date;
  image?: string | null;
};

const Chat = ({
  currentUser,
  selectedChatUser,
  setSelectedChatUser,
  isDesktop,
  activeChatId,
  onBackClick,
}: {
  currentUser: { uid: string; email: string };
  selectedChatUser: {
    uid: string;
    email: string;
    username?: string;
    profileImage?: string;
    isOnline?: boolean;
  };
  setSelectedChatUser: (user: any) => void;
  isDesktop: boolean;
  activeChatId: string;
  onBackClick: () => void;
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  const firestore = FIREBASE_Db;
  const storage = FIREBASE_Storage;
  const currentUserId = currentUser.uid;
  const chatPath = "chats";

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const messagesRef = collection(firestore, chatPath);
      const q = query(messagesRef, orderBy("createdAt", "asc"));

      const snapshot = await getDocs(q);
      const messagesData: Message[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          text: data.text,
          senderId: data.senderId,
          receiverId: data.receiverId,
          email: data.email,
          createdAt: data.createdAt?.toDate() || new Date(),
          image: data.image,
        };
      });

      const filteredMessages = messagesData.filter(
        (message) =>
          (message.senderId === currentUserId &&
            message.receiverId === selectedChatUser.uid) ||
          (message.receiverId === currentUserId &&
            message.senderId === selectedChatUser.uid)
      );

      setMessages(filteredMessages);
    } catch (error) {
      toast.error("Failed to load messages.");
      console.error("Fetch messages error:", error);
    } finally {
      setLoading(false);
    }
  }, [currentUserId, selectedChatUser.uid, firestore, chatPath]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const imageName = `chat_images/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, imageName);
      const uploadTask = uploadBytesResumable(storageRef, file);

      return new Promise<string>((resolve, reject) => {
        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress =
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log("Upload is " + progress + "% done");
          },
          (error) => {
            toast.error("Failed to upload image.");
            console.error("Image upload error:", error);
            reject(error);
          },
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          }
        );
      });
    } catch (error) {
      toast.error("Failed to upload image.");
      console.error("Image upload error:", error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() && !selectedImage) return; // Check if there's text or an image to send

    setLoading(true);
    const trimmedText = inputText.trim();
    const newMessage: Message = {
      id: crypto.randomUUID(),
      text: trimmedText,
      senderId: currentUserId,
      receiverId: selectedChatUser.uid,
      email: currentUser.email,
      createdAt: new Date(),
      image: null, // Initially set image to null
    };

    setMessages((prevMessages) => [...prevMessages, newMessage]);
    setInputText(""); // Clear input field immediately

    try {
      const messageData = {
        text: trimmedText,
        senderId: currentUserId,
        receiverId: selectedChatUser.uid,
        email: currentUser.email,
        createdAt: Timestamp.fromDate(newMessage.createdAt),
        image: null, // Set image to null
      };

      const docRef = await addDoc(collection(firestore, chatPath), messageData);
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === newMessage.id ? { ...msg, id: docRef.id } : msg
        )
      );
    } catch (error) {
      toast.error("Failed to send message.");
      console.error("Send message error:", error);
      setMessages((prevMessages) =>
        prevMessages.filter((msg) => msg.id !== newMessage.id)
      );
    } finally {
      setLoading(false);
    }
  };

  const handleImageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
    } else {
      setSelectedImage(null);
    }
  };

  const handleImageUpload = async () => {
    if (!selectedImage) return;
    try {
      const imageUrl = await uploadImage(selectedImage);
      await handleSend(); // Send the message after uploading the image
      setSelectedImage(null); // Clear selected image after sending
    } catch (error) {
      console.error("Error handling image upload:", error);
    }
  };

  const openFullscreen = (imageUrl: string) => {
    setFullscreenImage(imageUrl);
  };

  const closeFullscreen = () => {
    setFullscreenImage(null);
  };

  const downloadImage = (imageUrl: string) => {
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = "downloaded_image.jpg"; // Customize the filename as needed
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="flex flex-col ml-18 h-full">
      {/* Chat header with back button for mobile */}
      <div className="p-4 border-b flex items-center gap-3">
        {!isDesktop && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBackClick}
            className="mr-2"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 ">
            <AvatarImage
              className="rounded-full h-10 w-10"
              src={selectedChatUser.profileImage}
            />
            <AvatarFallback>
              {selectedChatUser.username?.charAt(0).toUpperCase()}
              {selectedChatUser.email?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-medium">{selectedChatUser.email}</h3>
          </div>
        </div>
      </div>

      {/* Messages display area */}
      <div className="flex-grow overflow-y-auto p-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`p-2 rounded-lg mb-2 ${
              message.senderId === currentUserId
                ? "bg-blue-100 self-end text-right"
                : "bg-gray-200 self-start text-left"
            }`}
          >
            {message.image && (
              <img
                src={message.image}
                alt="Uploaded"
                className="max-w-48 h-34 rounded-md shadow-md mb-1 cursor-pointer"
                onClick={() => openFullscreen(message.image ?? "")} // Open fullscreen on click
              />
            )}
            <div>{message.text}</div>
            <small className="text-gray-500 mt-0.5">
              {new Date(message.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </small>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area for text and image upload */}
      <div className="flex items-center p-4 border-t bg-white shadow-md">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type a message..."
          className="flex-grow border rounded-lg p-2 mr-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <label htmlFor="image-upload" className="cursor-pointer">
          <ImagePlus className="h-6 w-6 text-gray-500 mr-2" />
        </label>
        <input
          ref={imageInputRef}
          type="file"
          id="image-upload"
          accept="image/*"
          onChange={handleImageInputChange}
          className="hidden"
        />
        <Button
          onClick={() => {
            handleSend(); // Send text message
            handleImageUpload(); // Send image if selected
          }}
          disabled={loading || uploading}
          className="ml-2"
        >
          Send
        </Button>
      </div>

      {/* Fullscreen modal for image */}
      {fullscreenImage && (
        <div className="fixed right-52 top-25 w-[60%] h-[60%] bg-black bg-opacity-75 flex items-center justify-center">
          <div className="relative flex justify-center items-center w-full h-full">
            <img
              src={fullscreenImage}
              alt="Fullscreen"
              className="max-w-full max-h-full"
            />
            <button
              onClick={closeFullscreen}
              className="absolute top-2 right-2 text-white text-2xl"
            >
              &times; {/* Close icon */}
            </button>
            <button
              onClick={() => downloadImage(fullscreenImage)}
              className="absolute bottom-2 left-2 bg-blue-500 text-white px-4 py-2 rounded"
            >
              <Download className="h-4 w-4 inline-block mr-1" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;

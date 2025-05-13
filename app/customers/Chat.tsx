"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
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
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils"; // Import cn utility

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

    const handleSend = async (imageUrl: string | null = null) => {
        if (!inputText.trim() && !imageUrl) return;

        setLoading(true);
        const trimmedText = inputText.trim();
        const newMessage: Message = {
            id: crypto.randomUUID(),
            text: trimmedText,
            senderId: currentUserId,
            receiverId: selectedChatUser.uid,
            email: currentUser.email,
            createdAt: new Date(),
            image: imageUrl,
        };

        setMessages((prevMessages) => [...prevMessages, newMessage]);
        setInputText("");
        setSelectedImage(null);

        try {
            const messageData = {
                text: trimmedText,
                senderId: currentUserId,
                receiverId: selectedChatUser.uid,
                email: currentUser.email,
                createdAt: Timestamp.fromDate(newMessage.createdAt),
                image: imageUrl,
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
            await handleSend(imageUrl);
        } catch (error) {
            console.error("Error handling image upload:", error);
            toast.error("Failed to send image.");
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
        a.download = "downloaded_image.jpg";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <div className="flex flex-col h-full">
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
                <AnimatePresence>
                    {messages.map((message) => {
                        const isCurrentUser = message.senderId === currentUserId;
                        return (
                            <motion.div
                                key={message.id}
                                initial={{ opacity: 0, y: isCurrentUser ? 10 : -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: isCurrentUser ? -10 : 10 }}
                                transition={{ duration: 0.2 }}
                                className={cn(
                                    "p-2 rounded-lg mb-2 flex max-w-[70%]",
                                    isCurrentUser
                                        ? "bg-blue-100 self-end text-right justify-end"
                                        : "bg-gray-200 self-start text-left justify-start"
                                )}
                            >
                                {message.image && (
                                    <div className="mb-1">
                                        <img
                                            src={message.image}
                                            alt="Uploaded"
                                            className="max-w-48 h-auto rounded-md shadow-md cursor-pointer"
                                            onClick={() => openFullscreen(message.image ?? "")}
                                        />
                                    </div>
                                )}
                                <div className="break-words">{message.text}</div>
                                <small
                                    className={cn(
                                        "text-gray-500 mt-0.5",
                                        isCurrentUser ? "ml-2" : "mr-2"
                                    )}
                                >
                                    {new Date(message.createdAt).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </small>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
                <div ref={messagesEndRef} />
            </div>

            {/* Input area for text and image upload */}
            <div className="flex items-center h-[80px] pb-20 md:pt-20">
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
                        if (selectedImage) {
                            handleImageUpload();
                        } else {
                            handleSend();
                        }
                    }}
                    disabled={loading || uploading}
                    className="ml-2"
                >
                    Send
                </Button>
            </div>

            {/* Fullscreen modal for image */}
            <AnimatePresence>
                {fullscreenImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed right-52 top-25 w-[60%] h-[60%] bg-black bg-opacity-75 flex items-center justify-center z-50"
                    >
                        <div className="relative flex justify-center items-center w-full h-full">
                            <img
                                src={fullscreenImage}
                                alt="Fullscreen"
                                className="max-w-full max-h-full object-contain"
                            />
                            <button
                                onClick={closeFullscreen}
                                className="absolute top-2 right-2 text-white text-2xl"
                            >
                                &times;
                            </button>
                            <button
                                onClick={() => downloadImage(fullscreenImage)}
                                className="absolute bottom-2 left-2 bg-blue-500 text-white px-4 py-2 rounded"
                            >
                                <Download className="h-4 w-4 inline-block mr-1" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Chat;


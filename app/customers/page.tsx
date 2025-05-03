"use client";

import { useEffect, useState, useRef } from "react";
import {
  doc,
  collection,
  getDocs,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { FIREBASE_Db } from "@/FirebaseConfig";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { ChevronLeft, Circle, Plus, Send, User2Icon } from "lucide-react";

interface UserData {
  uid: string;
  username?: string;
  email: string;
  profileImage?: string;
  displayName?: string;
  lastMessage?: {
    text?: string;
    timestamp?: number;
  };
  isOnline?: boolean;
}

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  email: string; // Add email field
  createdAt: any; // Use Firestore Timestamp
}

interface Chat {
  id: string;
  users: string[]; // Array of user IDs in the chat
}

export default function UserChats() {
  const currentUser = {
    uid: "hQHGe8bnQ1TmJLFPrkf1DSfqId93",
    email: "mohammed.admin@gmail.com",
  };

  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [selectedChatUser, setSelectedChatUser] = useState<UserData | null>(
    null
  );
  const [isDesktop, setIsDesktop] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  useEffect(() => {
    fetchAllUsers();
    fetchChats();

    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    applyFilter();
  }, [users, searchQuery]);

  useEffect(() => {
    if (selectedChatUser && currentUser?.uid) {
      const chatId = getChatId(currentUser.uid, selectedChatUser.uid);
      setActiveChatId(chatId);
      fetchMessages(chatId);
    } else {
      setMessages([]);
      setActiveChatId(null);
    }
  }, [selectedChatUser, currentUser?.uid, chats]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchAllUsers = async () => {
    setError(null);
    setLoading(true);
    try {
      const usersCollectionRef = collection(FIREBASE_Db, "users");
      const usersSnapshot = await getDocs(usersCollectionRef);
      const usersList = usersSnapshot.docs.map((doc) => ({
        uid: doc.id,
        ...doc.data(),
      })) as UserData[];
      setUsers(usersList);
    } catch (error) {
      console.error("Error fetching users:", error);
      setError("Could not fetch users. Please try again.");
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const fetchChats = async () => {
    try {
      const chatsCollectionRef = collection(FIREBASE_Db, "chats");
      const chatsQuery = query(
        chatsCollectionRef,
        where("users", "array-contains", currentUser.uid)
      );
      onSnapshot(chatsQuery, (snapshot) => {
        const chatsList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Chat[];
        setChats(chatsList);
      });
    } catch (error) {
      console.error("Error fetching chats:", error);
      toast.error("Failed to load chats");
    }
  };

  const getChatId = (userId1: string, userId2: string): string => {
    const sortedIds = [userId1, userId2].sort();
    return `${sortedIds[0]}__${sortedIds[1]}`;
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase();
    }
    return email ? email[0].toUpperCase() : "U";
  };

  const applyFilter = () => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const result = users.filter(
        (user) =>
          user.username?.toLowerCase().includes(query) ||
          user.displayName?.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query)
      );
      setFilteredUsers(result);
    } else {
      setFilteredUsers(users);
    }
  };

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return "";
    // Check if timestamp is a Firestore Timestamp
    if (timestamp.toDate) {
      const date = timestamp.toDate(); // Convert Firestore Timestamp to Date
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } else if (timestamp instanceof Date) {
      // If it's already a Date object
      return timestamp.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    }
    return ""; // Return empty string if timestamp is of an unexpected type
  };

  const handleUserClick = (user: UserData) => {
    setSelectedChatUser(user);
  };

  const fetchMessages = async (chatId: string) => {
    if (!chatId) {
      setMessages([]);
      return;
    }
    try {
      const chatPath = "chats";
      const messagesCollectionRef = collection(FIREBASE_Db, chatPath);
      const messagesQuery = query(messagesCollectionRef, orderBy("createdAt"));

      onSnapshot(messagesQuery, (snapshot) => {
        const newMessages = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Message[];

        // Filter messages based on the selected chat user's email
        const filteredMessages = newMessages.filter(
          (msg) =>
            (msg.senderId === currentUser.uid && msg.text === "use client") ||
            (msg.email === selectedChatUser?.email &&
              msg.senderId !== currentUser.uid)
        );
        setMessages(filteredMessages);
      });
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error("Failed to load messages");
    }
  };

  const sendMessage = async () => {
    if (
      newMessage.trim() &&
      currentUser?.uid &&
      selectedChatUser?.uid &&
      activeChatId
    ) {
      try {
        const senderId = currentUser.uid;
        const receiverId = selectedChatUser.uid;
        const chatPath = "chats"; // Keep chatPath unchanged
        const messagesCollectionRef = collection(FIREBASE_Db, chatPath);

        const messageData = {
          senderId,
          receiverId,
          text: newMessage.trim(),
          email: currentUser.email,
          createdAt: serverTimestamp(), // Use serverTimestamp for Firestore
        };

        const docRef = await addDoc(messagesCollectionRef, messageData);
        console.log("Message sent with ID:", docRef.id);

        // Immediately update the local messages state to display the sent message
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            id: docRef.id,
            senderId,
            receiverId,
            text: "use client", // Set the text to "use client"
            email: currentUser.email, // Include the current user's email
            createdAt: new Date(), // Use the current date for display
          },
        ]);

        setNewMessage("");
      } catch (error) {
        console.error("Error sending message:", error);
        toast.error("Failed to send message");
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-background">
        <div className="space-y-4 w-full max-w-md">
          {[...Array(7)].map((_, i) => (
            <div
              key={i}
              className="flex items-center space-x-4 p-4 rounded-lg bg-muted/50 w-full"
            >
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-background text-center p-4">
        <div className="text-destructive mb-4">{error}</div>
        <Button onClick={fetchAllUsers} className="gap-2">
          <Circle className="h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-background flex">
      {/* Sidebar */}
      <div
        className={`bg-background border-r ${
          isDesktop ? "w-80" : selectedChatUser ? "hidden" : "w-full"
        } h-full flex flex-col`}
      >
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold">Messages</h2>
          <div className="mt-4 flex items-center gap-2">
            <Input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="divide-y">
            {filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <User2Icon className="mx-auto h-8 w-8 mb-2" />
                <p>
                  {searchQuery ? "No matching users found" : "No users yet"}
                </p>
                {searchQuery && (
                  <Button
                    variant="ghost"
                    className="mt-2"
                    onClick={() => setSearchQuery("")}
                  >
                    Clear search
                  </Button>
                )}
              </div>
            ) : (
              filteredUsers.map((user) => (
                <div
                  key={user.uid}
                  className={`p-4 hover:bg-muted/50 cursor-pointer transition-colors ${
                    selectedChatUser?.uid === user.uid ? "bg-muted" : ""
                  }`}
                  onClick={() => handleUserClick(user)}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        <AvatarImage
                          src={user.profileImage}
                          alt={user.username}
                        />
                        <AvatarFallback>
                          {getInitials(
                            user.displayName || user.username,
                            user.email
                          )}
                        </AvatarFallback>
                      </Avatar>
                      {user.isOnline && (
                        <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-green-500"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <h3 className="font-medium truncate">{user.email}</h3>
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <p className="text-sm text-muted-foreground truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      {selectedChatUser && currentUser?.uid && (
        <div
          className={`flex-1 flex flex-col ${
            isDesktop ? "" : "fixed inset-0 z-50 bg-background"
          }`}
          style={{ minWidth: "400px" }} // Set minimum width for chat area
        >
          {/* Chat Header */}
          <div className="p-4 border-b flex items-center gap-3">
            {!isDesktop && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedChatUser(null)}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            )}
            <Avatar className="h-10 w-10">
              <AvatarImage
                src={selectedChatUser.profileImage}
                alt={selectedChatUser.username}
              />
              <AvatarFallback>
                {getInitials(
                  selectedChatUser.displayName || selectedChatUser.username,
                  selectedChatUser.email
                )}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-medium">
                {selectedChatUser.username ||
                  selectedChatUser.displayName ||
                  selectedChatUser.email}
              </h3>
              <p className="text-sm text-muted-foreground">
                {selectedChatUser.isOnline ? "Online" : "Offline"}
              </p>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="space-y-4 p-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.senderId === currentUser.uid
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-xs md:max-w-md rounded-lg p-3 ${
                        msg.senderId === currentUser.uid
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-black"
                      }`}
                    >
                      <p>{msg.text}</p>
                      <p className="text-xs text-primary-10 text-right mt-1">
                        {formatTimestamp(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            
          </div>

          {/* Message Input */}
          <div className="p-4 border-t">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon">
                <Plus className="h-5 w-5" />
              </Button>
              <Input
                placeholder={`Message ${
                  selectedChatUser.username || selectedChatUser.displayName
                }`}
                className="flex-1"
                value={newMessage}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
              />
              <Button
                size="icon"
                onClick={sendMessage}
                disabled={!newMessage.trim()}
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

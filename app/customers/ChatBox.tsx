"use client";

import React, { useEffect, useState, useRef } from "react";
import { FIREBASE_Db } from "@/FirebaseConfig";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  where,
} from "firebase/firestore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface Message {
  id?: string;
  text: string;
  sender: string;
  receiver: string;
  createdAt: Date;
  seen: boolean;
  email: string;
  type: string;
}

interface User {
  uid: string;
  username?: string;
  email?: string;
  profileImage?: string;
  isAdmin?: boolean;
}

interface ChatBoxProps {
  selectedUser: User;
  unreadCount: number;
  onMessageRead: () => void;
  onClose: () => void;
  currentUserId: string;
}

export default function ChatBox({
  selectedUser,
  unreadCount,
  onMessageRead,
  onClose,
  currentUserId,
}: ChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedUser) {
      fetchMessages(selectedUser.uid);
    }
  }, [selectedUser]);

  useEffect(() => {
    if (messages.length > 0 && unreadCount > 0) {
      onMessageRead();
    }
  }, [messages, unreadCount, onMessageRead]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async (uid: string) => {
    setLoading(true);
    setError(null);
    try {
      const messagesCollectionRef = collection(FIREBASE_Db, "messages");
      const q = query(
        messagesCollectionRef,
        where("senderId", "in", [uid, currentUserId]),
        where("receiverId", "in", [uid, currentUserId]),
        orderBy("timestamp", "asc")
      );

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const fetchedMessages: Message[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          fetchedMessages.push({
            id: doc.id,
            text: data.text,
            sender: data.senderId,
            receiver: data.receiverId,
            createdAt: data.timestamp?.toDate(),
            seen: data.seen || false,
            email: data.email || "",
            type: data.type || "text",
          });
        });
        setMessages(fetchedMessages);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (err) {
      console.error("Error fetching messages:", err);
      setError("Could not fetch messages. Please try again.");
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedUser) return;

    try {
      await addDoc(collection(FIREBASE_Db, "messages"), {
        text: newMessage,
        senderId: currentUserId,
        receiverId: selectedUser.uid,
        timestamp: serverTimestamp(),
        seen: false,
        email: "admin@example.com", // Replace with actual admin email
        type: "text",
      });

      setNewMessage("");
    } catch (err) {
      console.error("Error sending message:", err);
      setError("Failed to send message. Please try again.");
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const formatTime = (date?: Date) => {
    if (!date) return "";
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Card className="fixed bottom-4 right-4 w-96 h-[500px] flex flex-col border shadow-lg">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/50">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={selectedUser.profileImage} />
            <AvatarFallback>
              {selectedUser.username?.charAt(0).toUpperCase() ||
                selectedUser.email?.charAt(0).toUpperCase() ||
                "U"}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-medium">
              {selectedUser.username || selectedUser.email || "Unknown User"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {selectedUser.isAdmin ? "Admin" : "User"}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {unreadCount > 0 && (
            <Badge variant="destructive">{unreadCount}</Badge>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p>Loading messages...</p>
          </div>
        ) : error ? (
          <div className="text-destructive text-center p-4">{error}</div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">No messages yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.sender === currentUserId
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div
                  className={`max-w-xs p-3 rounded-lg ${
                    message.sender === currentUserId
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p>{message.text}</p>
                  <p
                    className={`text-xs mt-1 ${
                      message.sender === currentUserId
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground"
                    }`}
                  >
                    {formatTime(message.createdAt)}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 border-t">
        <div className="flex space-x-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                handleSendMessage();
              }
            }}
          />
          <Button onClick={handleSendMessage}>Send</Button>
        </div>
      </div>
    </Card>
  );
}

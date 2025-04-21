"use client";

import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  where,
} from "firebase/firestore";
import { FIREBASE_Db } from "@/FirebaseConfig";
import ChatBox from "./ChatBox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Message {
  createdAt: Date; // Date object for the timestamp
  email: string; // Sender's email
  sender: string; // Sender ID
  text: string; // Message text
  type: string; // Message type
}

interface User {
  uid: string;
  username?: string;
  email?: string;
  profileImage?: string;
  lastMessage?: Message; // Update to use Message type
  unreadCount?: number;
  isAdmin?: boolean;
  lastMessageSeen?: boolean;
}

export default function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]); // State for messages

  useEffect(() => {
    const fetchAllUsers = async () => {
      setError(null);
      setLoading(true);
      try {
        const usersCollectionRef = collection(FIREBASE_Db, "users");
        const usersQuery = query(
          usersCollectionRef,
          orderBy("username"),
          limit(50)
        );
        const usersSnapshot = await getDocs(usersQuery);

        const usersList = usersSnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            uid: doc.id,
            username: data.username,
            email: data.email,
            profileImage: data.profileImage,
            lastMessage: data.lastMessage
              ? {
                  createdAt: data.lastMessage.createdAt.toDate(), // Convert Firestore timestamp to Date
                  email: data.lastMessage.email,
                  sender: data.lastMessage.sender,
                  text: data.lastMessage.text,
                  type: data.lastMessage.type,
                }
              : null,
            unreadCount: calculateUnreadCount(data),
            lastMessageSeen: data.lastMessageSeen || false,
          };
        }) as User[];

        setUsers(usersList);
      } catch (err) {
        console.error("Error fetching users:", err);
        setError("Could not fetch users. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchAllUsers();
  }, []);

  const calculateUnreadCount = (userData: any): number => {
    return userData.lastMessage?.sender === "client" &&
      !userData.lastMessageSeen
      ? 1
      : 0;
  };

  const handleUserClick = async (user: User) => {
    setSelectedUser(user);
    await fetchMessages(user.uid); // Fetch messages for the selected user
  };

  const fetchMessages = async (uid: string) => {
    try {
      const messagesCollectionRef = collection(FIREBASE_Db, "messages");
      const messagesQuery = query(
        messagesCollectionRef,
        where("senderId", "==", uid), // Fetch messages from the selected user
        orderBy("timestamp", "asc")
      );
      const messagesSnapshot = await getDocs(messagesQuery);

      const fetchedMessages = messagesSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          text: data.text,
          sender: data.senderId,
          receiver: data.receiverId,
          createdAt: data.timestamp?.toDate(),
          seen: data.seen || false,
          email: data.email || "", // Add email property
          type: data.type || "text", // Add type property with a default value
        } as Message;
      });

      setMessages(fetchedMessages);
    } catch (err) {
      console.error("Error fetching messages:", err);
      setError("Could not fetch messages. Please try again.");
    }
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) return name.charAt(0).toUpperCase();
    if (email) return email.charAt(0).toUpperCase();
    return "U";
  };

  const formatTime = (date?: Date) => {
    if (!date) return "";
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <h1 className="text-2xl font-semibold">Messages</h1>
        <p className="text-sm text-muted-foreground">
          Connect with your customers
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="p-4 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4 p-2">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-[120px]" />
                <Skeleton className="h-3 w-[200px]" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <Alert variant="destructive" className="m-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Empty State */}
      {!loading && users.length === 0 && (
        <div className="flex flex-col items-center justify-center p-8 space-y-4">
          <p className="text-muted-foreground">No users available</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Refresh
          </Button>
        </div>
      )}

      {/* User List */}
      <div className="flex-1 overflow-y-auto">
        {users.map((user) => (
          <Card
            key={user.uid}
            onClick={() => handleUserClick(user)}
            className={`p-3 m-2 cursor-pointer transition-colors hover:bg-accent ${
              selectedUser?.uid === user.uid ? "bg-accent" : ""
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={user.profileImage} />
                  <AvatarFallback>
                    {getInitials(user.username, user.email)}
                  </AvatarFallback>
                </Avatar>
                {user.unreadCount ? (
                  <Badge
                    className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center"
                    variant="destructive"
                  >
                    {user.unreadCount}
                  </Badge>
                ) : null}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium truncate">
                    {user.username || user.email || "Unknown User"}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {user.lastMessage
                      ? formatTime(user.lastMessage.createdAt)
                      : ""}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground truncate">
                    {user.lastMessage?.text || "No messages yet"}
                  </p>
                  {user.unreadCount ? (
                    <div className="w-2 h-2 rounded-full bg-primary ml-2" />
                  ) : null}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Chat Box */}
      {selectedUser && (
        <ChatBox
          selectedUser={selectedUser}
          unreadCount={selectedUser.unreadCount || 0}
          onMessageRead={() => {
            setUsers(
              users.map((u) =>
                u.uid === selectedUser.uid
                  ? { ...u, unreadCount: 0, lastMessageSeen: true }
                  : u
              )
            );
            console.log(
              `Messages for ${selectedUser?.username} marked as read.`
            );
          }}
          onClose={() => setSelectedUser(null)}
          currentUserId="mohammed@admin.et" // Replace with the actual admin ID
        />
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { FIREBASE_Db } from "@/FirebaseConfig";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { User2Icon } from "lucide-react";
import { toast } from "sonner";

interface UserData {
  uid: string;
  username?: string;
  email: string;
  profileImage?: string;
  displayName?: string;
  isOnline?: boolean;
}

interface UserListProps {
  currentUser: {
    uid: string;
    email: string;
  };
  selectedChatUser: UserData | null;
  setSelectedChatUser: (user: UserData) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export default function UserList({
  currentUser,
  selectedChatUser,
  setSelectedChatUser,
  searchQuery,
  setSearchQuery,
}: UserListProps) {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);

  useEffect(() => {
    fetchAllUsers();
  }, []);

  useEffect(() => {
    applyFilter();
  }, [users, searchQuery]);

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
      // Filter out the current user from the list
      const otherUsers = usersList.filter(
        (user) => user.uid !== currentUser.uid
      );
      setUsers(otherUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      setError("Could not fetch users. Please try again.");
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
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

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col bg-background">
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold">Messages</h2>
          <div className="mt-4 flex items-center gap-2">
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="divide-y">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 min-w-0">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48 mt-1" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-background text-center p-4">
        <div className="text-destructive mb-4">{error}</div>
        <Button onClick={fetchAllUsers} className="gap-2">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-background border-r w-80 h-full flex flex-col">
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
                {searchQuery
                  ? "No matching users found"
                  : "No other users available"}
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
                onClick={() => setSelectedChatUser(user)}
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
                    <h3 className="font-medium truncate">{user.username}</h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

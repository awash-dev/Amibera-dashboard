"use client";

import { useState } from "react";
import UserList from "./UserList";
import Chat from "./Chat";

type UserData = {
  uid: string;
  email: string;
  username?: string;
  profileImage?: string;
  isOnline?: boolean;
};

export default function UserChats() {
  const currentUser: UserData = {
    uid: "hQHGe8bnQ1TmJLFPrkf1DSfqId93",
    email: "mohammed.admin@gmail.com",
    // Add other properties if needed for currentUser
  };

  const [selectedChatUser, setSelectedChatUser] = useState<UserData | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");

  // Function to generate a unique chat ID based on user IDs
  const getChatId = (userId1: string, userId2: string): string => {
    const sortedIds = [userId1, userId2].sort();
    return `${sortedIds[0]}__${sortedIds[1]}`;
  };

  // Function to handle back button click (primarily for mobile, but kept for consistency)
  const handleBackClick = () => {
    setSelectedChatUser(null);
  };

  return (
    <div className="w-full h-screen bg-background flex overflow-hidden">
      {/* User List */}
      <div className="w-1/ border-r flex-shrink-0">
        <UserList
          currentUser={currentUser}
          selectedChatUser={selectedChatUser}
          setSelectedChatUser={setSelectedChatUser}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
      </div>

      {/* Chat Area */}
      <div className="flex-1 w-1/2 flex flex-col">
        {selectedChatUser ? (
          <Chat
            currentUser={currentUser}
            selectedChatUser={selectedChatUser}
            setSelectedChatUser={setSelectedChatUser}
            isDesktop={true} // Explicitly set isDesktop to true
            activeChatId={getChatId(currentUser.uid, selectedChatUser.uid)}
            onBackClick={handleBackClick}
          />
        ) : (
          // Display a placeholder or instruction when no chat is selected
          <div className="flex  w-1/ items-center justify-center h-full bg-gray-100 text-gray-500">
            Select a user to start chatting.
          </div>
        )}
      </div>
    </div>
  );
}

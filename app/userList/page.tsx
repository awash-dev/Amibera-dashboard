"use client";

import { useEffect, useState } from "react";
import { doc, collection, getDocs, deleteDoc } from "firebase/firestore";
import { getAuth, deleteUser } from "firebase/auth";
import { FIREBASE_Db } from "@/FirebaseConfig";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface UserData {
  uid: string;
  username?: string;
  email: string;
  password?: string;
  profileImage?: string;
  displayName?: string;
}

export default function UserList() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchAllUsers();
  }, []);

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

  const handleDeleteClick = (userId: string) => {
    setUserToDelete(userId);
    setConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    setDeletingId(userToDelete);
    setConfirmOpen(false);

    try {
      await deleteUserFromFirestore(userToDelete);
      await deleteUserFromAuth(userToDelete);
      setUsers(users.filter((u) => u.uid !== userToDelete));
      toast.success("User deleted successfully");
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Could not delete user. Please try again.");
    } finally {
      setDeletingId(null);
      setUserToDelete(null);
    }
  };

  const deleteUserFromFirestore = async (userId: string) => {
    const userDocRef = doc(FIREBASE_Db, "users", userId);
    await deleteDoc(userDocRef);
  };

  const deleteUserFromAuth = async (userId: string) => {
    const auth = getAuth();
    try {
      const user = auth.currentUser;
      if (user && user.uid === userId) {
        await deleteUser(user);
      } else {
        console.warn("User not found in Auth or already deleted.");
      }
    } catch (error) {
      console.warn("User not found in Auth or already deleted:", error);
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
      <div className="p-6 space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-600 mb-4">{error}</div>
        <Button onClick={fetchAllUsers}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Profile</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((user, index) => (
                <TableRow key={user.uid}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell className="font-medium">
                    {user.username || user.displayName || "N/A"}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Avatar>
                      <AvatarImage src={user.profileImage} />
                      <AvatarFallback>
                        {getInitials(
                          user.displayName || user.username,
                          user.email
                        )}
                      </AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteClick(user.uid)}
                      disabled={deletingId === user.uid}
                    >
                      {deletingId === user.uid ? "Deleting..." : "Delete"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              user account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

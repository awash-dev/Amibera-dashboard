"use client";

import React, { useEffect, useState } from "react";
import { FIREBASE_Db } from "@/FirebaseConfig";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Download, Image as ImageIcon } from "lucide-react";

interface ProductImage {
  url: string;
  name: string;
}

interface OrderItem {
  product: {
    name: string;
    image: string;
  };
  quantity: number;
}

interface Customer {
  fullName: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  screenshot?: string;
}

interface Order {
  id: string;
  createdAt: string;
  customer: Customer;
  items: OrderItem[];
  totalAmount: number;
  status: "Review" | "Pending" | "Failed" | "Delivered";
}

export default function OrderList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<ProductImage[]>([]);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const ordersCollection = collection(FIREBASE_Db, "orders");
        const orderSnapshot = await getDocs(ordersCollection);
        const orderList = orderSnapshot.docs.map((doc) => {
          const orderData = doc.data();
          return {
            id: doc.id,
            ...orderData,
            status: orderData.status || "Review",
          } as Order;
        });
        setOrders(orderList);
      } catch (error) {
        console.error("Error fetching orders:", error);
        setError("Could not load orders. Please try again later.");
        toast.error("Failed to load orders");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const handleStatusChange = async (
    orderId: string,
    newStatus: Order["status"]
  ) => {
    try {
      const orderRef = doc(FIREBASE_Db, "orders", orderId);
      await updateDoc(orderRef, { status: newStatus });
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );
      toast.success("Order status updated");
    } catch (error) {
      console.error("Error updating order status:", error);
      toast.error("Failed to update order status");
    }
  };

  const handleImageClick = (items: OrderItem[]) => {
    setSelectedImages(
      items.map((item) => ({
        url: item.product.image,
        name: item.product.name,
      }))
    );
  };

  const downloadImage = (imageUrl: string, imageName: string) => {
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `${imageName.replace(/\s+/g, "_")}_product.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return (
        <div className="flex flex-col">
          <span>{format(date, "dd/MM/yyyy")}</span>
          <span className="text-xs text-muted-foreground">
            {format(date, "HH:mm")}
          </span>
        </div>
      );
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-[200px]" />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-600 mb-4">{error}</div>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Order Management</h1>

      <div className="rounded-md border overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-[1000px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Date/Time</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead className="w-[100px]">Images</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="w-[150px]">Status</TableHead>
                <TableHead>Proof</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">
                    No orders available
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>{formatDate(order.createdAt)}</TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {order.customer.fullName}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {order.customer.city}, {order.customer.address}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {order.items.map((item, index) => (
                          <div key={index} className="text-sm">
                            {item.product.name} × {item.quantity}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleImageClick(order.items)}
                          >
                            <ImageIcon className="h-4 w-4" />
                            <span className="ml-2">
                              {order.items.length > 1
                                ? `${order.items.length} images`
                                : "View"}
                            </span>
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-[80vw]">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {order.items.map((item, index) => (
                              <div key={index} className="space-y-2">
                                <img
                                  src={item.product.image}
                                  alt={item.product.name}
                                  className="w-full h-auto rounded-lg"
                                />
                                <div className="flex justify-between items-center">
                                  <span className="text-sm font-medium">
                                    {item.product.name} × {item.quantity}
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      downloadImage(
                                        item.product.image,
                                        item.product.name
                                      )
                                    }
                                  >
                                    <Download className="h-4 w-4 mr-2" />
                                    Download
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{order.customer.phone}</div>
                      <div className="text-sm text-muted-foreground">
                        {order.customer.email}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {order.totalAmount.toFixed(2)} birr
                    </TableCell>
                    <TableCell>
                      <Select
                        value={order.status}
                        onValueChange={(value: Order["status"]) =>
                          handleStatusChange(order.id, value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Review">
                            <Badge variant="secondary">Review</Badge>
                          </SelectItem>
                          <SelectItem value="Pending">
                            <Badge>Pending</Badge>
                          </SelectItem>
                          <SelectItem value="Failed">
                            <Badge variant="destructive">Failed</Badge>
                          </SelectItem>
                          <SelectItem value="Delivered">
                            <Badge variant="default">Delivered</Badge>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {order.customer.screenshot && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              View
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-[80vw]">
                            <img
                              src={order.customer.screenshot}
                              alt="Payment proof"
                              className="w-full h-[350px] rounded-lg"
                            />
                            <div className="flex justify-end mt-4">
                              <Button
                                variant="outline"
                                onClick={() =>
                                  downloadImage(
                                    order.customer.screenshot!,
                                    `payment_proof_${order.id}`
                                  )
                                }
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { FIREBASE_Db } from "@/FirebaseConfig";
import {
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
  Tooltip,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar1Icon } from "lucide-react";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

interface User {
  id: string;
  username: string;
  email: string;
  profileImage: string;
  listedProducts: number;
  createdAt: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  stock: number;
  listedBy: string;
  createdAt: string;
  imageUrl?: string;
}

interface Order {
  id: string;
  customer: {
    fullName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    screenshot?: string;
  };
  date: string;
  amount: number;
  status: string;
  products: {
    id: string;
    name: string;
    quantity: number;
    price: number;
  }[];
  createdAt: string;
}

interface TrendData {
  date: string;
  users: number;
  products: number;
  orders: number;
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalProducts: 0,
    activeListers: 0,
    newListersThisMonth: 0,
  });
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });

  // Filter states
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [productCategoryFilter, setProductCategoryFilter] = useState("all");
  const [orderSearchTerm, setOrderSearchTerm] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Generate trend data
  const generateTrendData = (
    users: User[],
    products: Product[],
    orders: Order[],
    range: { from: Date; to: Date }
  ) => {
    const dailyData: Record<
      string,
      { users: number; products: number; orders: number }
    > = {};

    // Initialize with zeros for each day in range
    const currentDate = new Date(range.from);
    while (currentDate <= range.to) {
      const dateStr = currentDate.toISOString().split("T")[0];
      dailyData[dateStr] = { users: 0, products: 0, orders: 0 };
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Count daily users
    users.forEach((user) => {
      const userDate = new Date(user.createdAt);
      if (userDate >= range.from && userDate <= range.to) {
        const dateStr = userDate.toISOString().split("T")[0];
        if (dailyData[dateStr]) {
          dailyData[dateStr].users += 1;
        }
      }
    });

    // Count daily products
    products.forEach((product) => {
      const productDate = new Date(product.createdAt);
      if (productDate >= range.from && productDate <= range.to) {
        const dateStr = productDate.toISOString().split("T")[0];
        if (dailyData[dateStr]) {
          dailyData[dateStr].products += 1;
        }
      }
    });

    // Count daily orders
    orders.forEach((order) => {
      const orderDate = new Date(order.createdAt);
      if (orderDate >= range.from && orderDate <= range.to) {
        const dateStr = orderDate.toISOString().split("T")[0];
        if (dailyData[dateStr]) {
          dailyData[dateStr].orders += 1;
        }
      }
    });

    // Convert to array and calculate cumulative totals
    let cumulativeUsers = 0;
    let cumulativeProducts = 0;
    let cumulativeOrders = 0;

    return Object.keys(dailyData)
      .sort()
      .map((date) => {
        cumulativeUsers += dailyData[date].users;
        cumulativeProducts += dailyData[date].products;
        cumulativeOrders += dailyData[date].orders;

        return {
          date,
          users: cumulativeUsers,
          products: cumulativeProducts,
          orders: cumulativeOrders,
        };
      });
  };

  // Fetch data in real-time
  useEffect(() => {
    setLoading(true);

    // Users subscription
    const usersUnsub = onSnapshot(
      collection(FIREBASE_Db, "users"),
      (snapshot) => {
        const now = new Date();
        const monthAgo = new Date(now.setMonth(now.getMonth() - 1));

        const usersData = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            username: data.username || "Unknown",
            email: data.email || "No email",
            profileImage: data.profileImage || "/logo.jpg",
            listedProducts: data.listedProducts || 0,
            createdAt: data.createdAt || new Date().toISOString(),
          } as User;
        });

        setUsers(usersData);
        setStats((prev) => ({
          ...prev,
          activeListers: usersData.filter((u) => u.listedProducts > 0).length,
          newListersThisMonth: usersData.filter(
            (u) => new Date(u.createdAt) > monthAgo
          ).length,
        }));
      }
    );

    // Products subscription
    const productsUnsub = onSnapshot(
      collection(FIREBASE_Db, "products"),
      (snapshot) => {
        const productsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt || new Date().toISOString(),
          imageUrl: doc.data().imageUrl || "/placeholder-product.png",
        })) as Product[];
        setProducts(productsData);
        setStats((prev) => ({
          ...prev,
          totalProducts: productsData.length,
        }));
      }
    );

    // Orders subscription
    const ordersQuery = query(
      collection(FIREBASE_Db, "orders"),
      orderBy("createdAt", "desc"),
      limit(100)
    );
    const ordersUnsub = onSnapshot(ordersQuery, (snapshot) => {
      const ordersData = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          customer: data.customer || {
            fullName: "Unknown",
            email: "",
            phone: "",
            address: "",
            city: "",
          },
          date: data.date || "",
          amount: data.totalAmount || 0,
          status: data.status || "Pending",
          products: data.products || [],
          createdAt: data.createdAt || new Date().toISOString(),
        } as Order;
      });
      setOrders(ordersData);

      // Calculate stats
      const revenue = ordersData.reduce((sum, order) => sum + order.amount, 0);
      setStats((prev) => ({
        ...prev,
        totalOrders: ordersData.length,
        totalRevenue: revenue,
      }));
    });

    setLoading(false);

    // Cleanup subscriptions
    return () => {
      usersUnsub();
      productsUnsub();
      ordersUnsub();
    };
  }, []);

  // Update trend data when data or date range changes
  useEffect(() => {
    if (users.length > 0 && products.length > 0 && orders.length > 0) {
      setTrendData(generateTrendData(users, products, orders, dateRange));
    }
  }, [users, products, orders, dateRange]);

  // Filter functions
  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  const filteredProducts = products
    .filter((product) =>
      product.name.toLowerCase().includes(productSearchTerm.toLowerCase())
    )
    .filter((product) =>
      productCategoryFilter === "all"
        ? true
        : product.category === productCategoryFilter
    );

  const filteredOrders = orders
    .filter(
      (order) =>
        order.customer.fullName
          .toLowerCase()
          .includes(orderSearchTerm.toLowerCase()) ||
        order.id.toLowerCase().includes(orderSearchTerm.toLowerCase())
    )
    .filter((order) =>
      orderStatusFilter === "all" ? true : order.status === orderStatusFilter
    );

  // Chart data
  const userListingData = users
    .filter((user) => user.listedProducts > 0)
    .sort((a, b) => b.listedProducts - a.listedProducts)
    .slice(0, 5)
    .map((user) => ({
      name: user.username,
      products: user.listedProducts,
    }));

  const categoryData = products.reduce((acc, product) => {
    const existing = acc.find((item) => item.name === product.category);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: product.category, value: 1 });
    }
    return acc;
  }, [] as { name: string; value: number }[]);

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-96 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen overflow-hidden">
      <header className="bg-background border-b sticky top-0 z-10">
        <div className="container flex h-16 items-center justify-between px-4">
          <h1 className="text-lg sm:text-xl font-bold">Product Listing Dashboard</h1>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="sticky  bg-background z-10 overflow-x-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">User List</TabsTrigger>
            <TabsTrigger value="products">Listed Products</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">
                    Total Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold">
                    {stats.totalRevenue.toLocaleString()} Birr
                  </div>
                  <p className="text-xs text-muted-foreground">
                    From all orders
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Orders
                  </CardTitle>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4 text-muted-foreground"
                  >
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold">{stats.totalOrders}</div>
                  <p className="text-xs text-muted-foreground">
                    Completed orders
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Products Listed
                  </CardTitle>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4 text-muted-foreground"
                  >
                    <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" />
                    <path d="m3 9 2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9" />
                    <path d="M12 3v6" />
                  </svg>
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold">
                    {stats.totalProducts}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Currently listed
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    New Users
                  </CardTitle>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4 text-muted-foreground"
                  >
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold">
                    {stats.newListersThisMonth}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Joined this month
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
              <Card className="lg:col-span-4">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <CardTitle className="text-lg">Growth Trends</CardTitle>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className="w-full sm:w-[240px] justify-start text-left font-normal"
                      >
                        <Calendar1Icon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (
                          dateRange.to ? (
                            <>
                              {format(dateRange.from, "LLL dd, y")} -{" "}
                              {format(dateRange.to, "LLL dd, y")}
                            </>
                          ) : (
                            format(dateRange.from, "LLL dd, y")
                          )
                        ) : (
                          <span>Pick a date range</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        mode="range"
                        selected={dateRange}
                        onSelect={(range) => {
                          if (range?.from && range?.to) {
                            setDateRange({ from: range.from, to: range.to });
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </CardHeader>
                <CardContent className="pl-2">
                  <div className="h-[300px] sm:h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(date) =>
                            new Date(date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })
                          }
                          stroke="#888888"
                          tickMargin={10}
                        />
                        <YAxis stroke="#888888" tickMargin={10} />
                        <Tooltip
                          labelFormatter={(date) =>
                            new Date(date).toLocaleDateString("en-US", {
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            })
                          }
                          contentStyle={{
                            backgroundColor: "#ffffff",
                            border: "1px solid #e2e8f0",
                            borderRadius: "0.5rem",
                            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                          }}
                        />
                        <Legend
                          wrapperStyle={{
                            paddingTop: "20px",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="users"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          name="Total Users"
                          dot={{ r: 4, fill: "#3b82f6", strokeWidth: 2 }}
                          activeDot={{ r: 6, stroke: "#3b82f6", strokeWidth: 2 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="products"
                          stroke="#10b981"
                          strokeWidth={2}
                          name="Total Products"
                          dot={{ r: 4, fill: "#10b981", strokeWidth: 2 }}
                          activeDot={{ r: 6, stroke: "#10b981", strokeWidth: 2 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="orders"
                          stroke="#f59e0b"
                          strokeWidth={2}
                          name="Total Orders"
                          dot={{ r: 4, fill: "#f59e0b", strokeWidth: 2 }}
                          activeDot={{ r: 6, stroke: "#f59e0b", strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-3">
                <CardHeader>
                  <CardTitle className="text-lg">Products by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] sm:h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) =>
                            `${name}: ${(percent * 100).toFixed(0)}%`
                          }
                        >
                          {categoryData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Customer</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orders.slice(0, 5).map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="whitespace-nowrap">
                              {order.customer.fullName}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {new Date(order.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {order.amount.toFixed(2)} Birr
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  order.status === "Delivered"
                                    ? "default"
                                    : order.status === "Failed"
                                    ? "secondary"
                                    : "destructive"
                                }
                              >
                                {order.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recently Listed Products</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Category</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {products.slice(0, 5).map((product) => (
                          <TableRow key={product.id}>
                            <TableCell className="whitespace-nowrap">{product.name}</TableCell>
                            <TableCell className="whitespace-nowrap">
                              {product.price.toFixed(2)} Birr
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {product.category}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row items-center py-4 gap-4">
                  <Input
                    placeholder="Search users by name or email..."
                    className="w-full sm:max-w-sm"
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                  />
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Profile</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.length > 0 ? (
                        filteredUsers
                          .sort(
                            (a, b) =>
                              new Date(b.createdAt).getTime() -
                              new Date(a.createdAt).getTime()
                          )
                          .map((user) => (
                            <TableRow key={user.id}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <img
                                    src={user.profileImage}
                                    alt={user.username}
                                    className="h-10 w-10 rounded-full"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src =
                                        "/logo.jpg";
                                    }}
                                  />
                                </div>
                              </TableCell>
                              <TableCell className="font-medium whitespace-nowrap">
                                {user.username}
                              </TableCell>
                              <TableCell className="whitespace-nowrap">{user.email}</TableCell>
                              <TableCell className="whitespace-nowrap">
                                {formatDate(user.createdAt)}
                              </TableCell>
                            </TableRow>
                          ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-4">
                            No users found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Listed Products</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row items-center py-4 gap-4">
                  <Input
                    placeholder="Search products..."
                    className="w-full sm:max-w-sm"
                    value={productSearchTerm}
                    onChange={(e) => setProductSearchTerm(e.target.value)}
                  />
                  <Select
                    value={productCategoryFilter}
                    onValueChange={setProductCategoryFilter}
                  >
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {Array.from(new Set(products.map((p) => p.category))).map(
                        (category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Image</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Category</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.length > 0 ? (
                        filteredProducts.map((product) => (
                          <TableRow key={product.id}>
                            <TableCell className="font-medium whitespace-nowrap">
                              {product.name}
                            </TableCell>
                            <TableCell>
                              <div className="h-10 w-10 overflow-hidden rounded-md"></div>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {product.price.toFixed(2)} Birr
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{product.category}</Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-4">
                            No products found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Order History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row items-center py-4 gap-4">
                  <Input
                    placeholder="Search orders..."
                    className="w-full sm:max-w-sm"
                    value={orderSearchTerm}
                    onChange={(e) => setOrderSearchTerm(e.target.value)}
                  />
                  <Select
                    value={orderStatusFilter}
                    onValueChange={setOrderStatusFilter}
                  >
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Failed">Failed</SelectItem>
                      <SelectItem value="Delivered">Delivered</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-4">
                  {filteredOrders.length > 0 ? (
                    filteredOrders.map((order) => (
                      <Card
                        key={order.id}
                        className="border rounded-lg overflow-hidden"
                      >
                        <div className="p-4 bg-gray-50 border-b">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                            <div>
                              <h3 className="font-medium">Order #{order.id}</h3>
                              <p className="text-sm text-muted-foreground">
                                {formatDate(order.createdAt)}
                              </p>
                            </div>
                            <Badge
                              variant={
                                order.status === "Delivered"
                                  ? "default"
                                  : order.status === "Failed"
                                  ? "secondary"
                                  : "destructive"
                              }
                            >
                              {order.status}
                            </Badge>
                          </div>
                        </div>

                        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <h4 className="text-sm font-medium mb-2">
                              Customer
                            </h4>
                            <div className="space-y-1">
                              <p>{order.customer.fullName}</p>
                              <p className="text-sm text-muted-foreground">
                                {order.customer.email}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {order.customer.phone}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {order.customer.address}, {order.customer.city}
                              </p>
                            </div>
                          </div>

                          <div>
                            <h4 className="text-sm font-medium mb-2">
                              Payment
                            </h4>
                            <div className="space-y-2">
                              {order.customer.screenshot && (
                                <Button
                                  variant="link"
                                  className="p-0 h-auto text-blue-600"
                                  onClick={() =>
                                    window.open(
                                      order.customer.screenshot,
                                      "_blank"
                                    )
                                  }
                                >
                                  View Payment Proof
                                </Button>
                              )}
                              <p className="text-sm font-medium">
                                Total: {order.amount.toFixed(2)} Birr
                              </p>
                            </div>
                          </div>

                          <div>
                            <h4 className="text-sm font-medium mb-2">
                              Products
                            </h4>
                            <div className="space-y-2">
                              {order.products.map((product) => (
                                <div
                                  key={product.id}
                                  className="flex justify-between text-sm"
                                >
                                  <span>
                                    {product.name} (x{product.quantity})
                                  </span>
                                  <span className="font-medium">
                                    {(product.price * product.quantity).toFixed(
                                      2
                                    )}{" "}
                                    Birr
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <p>No orders found</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

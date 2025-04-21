"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { collection, getDocs, doc, deleteDoc } from "firebase/firestore";
import { FIREBASE_Db } from "@/FirebaseConfig";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Edit2,
  Trash2,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  description: string;
  image: string | string[];
}

export default function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isSliderOpen, setIsSliderOpen] = useState(false);
  const [currentProductImages, setCurrentProductImages] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("");

  const categories = ["አልጋ", "ቲቪ ስታንድ", "ቁምሳጥን", "ድሪሲንግ", "መጅሊስ", "ቡፌ"];

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);

    try {
      const productsCollection = collection(FIREBASE_Db, "products");
      const productSnapshot = await getDocs(productsCollection);
      const productList = productSnapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name || "",
        price: doc.data().price || 0,
        category: doc.data().category || "",
        description: doc.data().description || "",
        image: doc.data().image || "", // Default to an empty string
      }));
      setProducts(productList);
    } catch (error) {
      console.error("Error fetching products:", error);
      setError("Error fetching products. Please try again later.");
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const filterProducts = (
    products: Product[],
    term: string,
    category: string
  ) => {
    let filtered = products;

    if (category) {
      filtered = filtered.filter((product) => product.category === category);
    }

    if (!term) return filtered;

    const lowerTerm = term.toLowerCase();
    return filtered.filter(
      (product) =>
        product.name.toLowerCase().includes(lowerTerm) ||
        product.category.toLowerCase().includes(lowerTerm) ||
        product.description.toLowerCase().includes(lowerTerm) ||
        product.price.toString().includes(term)
    );
  };

  const filteredProducts = filterProducts(products, searchTerm, categoryFilter);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteDoc(doc(FIREBASE_Db, "products", id));
      setProducts((prev) => prev.filter((product) => product.id !== id));
      toast.success("Product deleted successfully");
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Failed to delete product");
    } finally {
      setDeletingId(null);
      setDeleteDialogOpen(false);
    }
  };

  const openImageSlider = (images: string[], index = 0) => {
    setCurrentProductImages(images);
    setCurrentImageIndex(index);
    setIsSliderOpen(true);
  };

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) =>
      prev === 0 ? currentProductImages.length - 1 : prev - 1
    );
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) =>
      prev === currentProductImages.length - 1 ? 0 : prev + 1
    );
  };

  const downloadImage = (imageUrl: string) => {
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `product-image-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderImageCells = (images: string | string[], productName: string) => {
    const safeImages = Array.isArray(images) ? images : [images]; // Ensure it's always an array

    if (safeImages.length === 0) {
      return <span className="text-xs text-gray-400">No images</span>;
    }

    if (safeImages.length === 1) {
      return (
        <Button
          variant="ghost"
          size="sm"
          className="p-0"
          onClick={() => openImageSlider(safeImages)}
        >
          <img
            src={safeImages[0]}
            alt={productName}
            className="h-12 w-12 object-cover rounded"
            onError={(e) => (e.currentTarget.src = "/placeholder-image.jpg")}
          />
        </Button>
      );
    }

    return (
      <div className="flex gap-2 items-center">
        {safeImages.slice(0, 3).map((img, index) => (
          <Button
            key={`${productName}-${index}`}
            variant="ghost"
            size="sm"
            className="p-0 relative group"
            onClick={() => openImageSlider(safeImages, index)}
          >
            <img
              src={img}
              alt={`${productName}-${index}`}
              className="h-12 w-12 object-cover rounded"
              onError={(e) => (e.currentTarget.src = "/placeholder-image.jpg")}
            />
            {index === 2 && safeImages.length > 3 && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded">
                <span className="text-white text-xs">
                  +{safeImages.length - 3}
                </span>
              </div>
            )}
          </Button>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-full" />
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
      <div className="text-center">
        <div className="text-red-600 mb-4">{error}</div>
        <Button onClick={() => window.location.reload()}>Refresh</Button>
      </div>
    );
  }

  return (
    <div className="xl:pl-16 space-y-4 pt-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold">Product List</h1>
        <div className="flex items-center gap-2">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-gray-50 p-4 rounded-md">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-md border">
        <Table className="w-full">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Images</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  {searchTerm || categoryFilter ? (
                    <div className="flex flex-col items-center gap-2">
                      <span>No products match your filters</span>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setSearchTerm("");
                          setCategoryFilter("");
                        }}
                        className="text-primary"
                      >
                        Clear filters
                      </Button>
                    </div>
                  ) : (
                    "No products found"
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.price.toFixed(2)} Birr</TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {product.description}
                  </TableCell>
                  <TableCell>
                    {renderImageCells(product.image, product.name)}
                  </TableCell>
                  <TableCell className="flex justify-end space-x-2">
                    <Link href={`/product-edit/${product.id}`} passHref>
                      <Button size="sm" variant="outline">
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </Link>
                    <AlertDialog
                      open={deleteDialogOpen && deletingId === product.id}
                      onOpenChange={(open) => {
                        setDeleteDialogOpen(open);
                        if (open) setDeletingId(product.id);
                      }}
                    >
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={deletingId === product.id}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {deletingId === product.id ? "Deleting..." : "Delete"}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Are you absolutely sure?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently
                            delete the product.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(product.id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Image Slider Modal */}
      <Dialog open={isSliderOpen} onOpenChange={setIsSliderOpen}>
        <DialogContent className="sm:max-w-[80vw] max-h-[90vh] flex flex-col">
          <div className="relative flex-grow flex items-center justify-center">
            {currentProductImages.length > 0 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 z-10"
                  onClick={handlePrevImage}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>

                <div className="relative w-full h-full flex items-center justify-center">
                  <img
                    src={currentProductImages[currentImageIndex]}
                    alt={`Product image ${currentImageIndex + 1}`}
                    className="max-w-full max-h-[70vh] object-contain"
                    onError={(e) =>
                      (e.currentTarget.src = "/placeholder-image.jpg")
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() =>
                      downloadImage(currentProductImages[currentImageIndex])
                    }
                  >
                    <Download className="h-5 w-5" />
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 z-10"
                  onClick={handleNextImage}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>
            )}
          </div>

          {currentProductImages.length > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              {currentProductImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`h-2 w-2 rounded-full ${
                    index === currentImageIndex ? "bg-primary" : "bg-gray-300"
                  }`}
                  aria-label={`Go to image ${index + 1}`}
                />
              ))}
            </div>
          )}

          <div className="text-center text-sm text-gray-500 mt-2">
            Image {currentImageIndex + 1} of {currentProductImages.length}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

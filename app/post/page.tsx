"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc } from "firebase/firestore";
import { FIREBASE_Db, FIREBASE_Storage } from "@/FirebaseConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface FormData {
  name: string;
  price: string;
  category: string;
  description: string;
  image: File[];
}

interface Category {
  value: string;
  label: string;
}

export default function CreateProduct() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    name: "",
    price: "",
    category: "",
    description: "",
    image: [],
  });
  const [loading, setLoading] = useState(false);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const categories: Category[] = [
    { value: "አልጋ", label: "አልጋ" },
    { value: "ቲቪ ስታንድ", label: "ቲቪ ስታንድ" },
    { value: "ቁምሳጥን", label: "ቁምሳጥን" },
    { value: "ድሪሲንግ", label: "ድሪሲንግ" },
    { value: "መጅሊስ", label: "መጅሊስ" },
    { value: "ቡፌ", label: "ቡፌ" },
  ];

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setFormData((prev) => ({ ...prev, image: files }));

      const previews = files.map((file) => URL.createObjectURL(file));
      setImagePreviews(previews);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validation
    if (!formData.name || !formData.price || !formData.category) {
      toast.error("Please fill in all required fields");
      setLoading(false);
      return;
    }

    if (parseFloat(formData.price) <= 0) {
      toast.error("Price must be greater than 0");
      setLoading(false);
      return;
    }

    if (formData.image.length === 0) {
      toast.error("Please upload at least one image");
      setLoading(false);
      return;
    }

    try {
      // Upload images
      const imageUrls = await Promise.all(
        formData.image.map(async (image) => {
          const imageRef = ref(FIREBASE_Storage, `products/${image.name}`);
          await uploadBytes(imageRef, image);
          return getDownloadURL(imageRef);
        })
      );

      // Save product data - using 'image' for the field name
      await addDoc(collection(FIREBASE_Db, "products"), {
        name: formData.name,
        price: parseFloat(formData.price),
        category: formData.category,
        description: formData.description,
        image: imageUrls, // Changed from 'images' to 'image'
        createdAt: new Date().toISOString(),
      });

      toast.success("Product created successfully!");
      
      // Reset form
      setFormData({
        name: "",
        price: "",
        category: "",
        description: "",
        image: [],
      });
      setImagePreviews([]);

      // Redirect after delay
      setTimeout(() => router.push("/products"), 1500);
    } catch (error) {
      toast.error("Failed to create product");
      console.error("Error creating product:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      imagePreviews.forEach((preview) => URL.revokeObjectURL(preview));
    };
  }, [imagePreviews]);

  return (
    <div className="container mx-auto pl-32 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Create New Product</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Product Name</Label>
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter product name"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="price">Price</Label>
          <Input
            id="price"
            name="price"
            type="number"
            value={formData.price}
            onChange={handleChange}
            placeholder="Enter price"
            min="0"
            step="0.01"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select
            name="category"
            value={formData.category}
            onValueChange={(value) =>
              setFormData({ ...formData, category: value })
            }
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="image">Product Images</Label>
          <Input
            id="image"
            type="file"
            onChange={handleFileChange}
            accept="image/*"
            multiple
            required
          />
          {imagePreviews.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="relative">
                  <img
                    src={preview}
                    alt={`Preview ${index}`}
                    className="w-24 h-24 object-cover rounded-md"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-4 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/products")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Product"}
          </Button>
        </div>
      </form>
    </div>
  );
}
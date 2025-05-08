"use client";

import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { FIREBASE_Db, FIREBASE_Storage } from "@/FirebaseConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface ProductFormData {
  name: string;
  price: string;
  category: string;
  description: string;
  image: string | string[]; // Changed to string array since we're storing URLs
}

interface Category {
  value: string;
  label: string;
}

export default function UpdateProduct() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    price: "",
    category: "",
    description: "",
    image: [],
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [hasImageChanged, setHasImageChanged] = useState<boolean>(false);

  const categories: Category[] = [
    { value: "አልጋ", label: "አልጋ" },
    { value: "ቲቪ ታንድ", label: "ቲቪ ስታንድ" },
    { value: "ቁምሳጥን", label: "ቁምሳጥን" },
    { value: "ድሪሲንግ", label: "ድሪሲንግ" },
    { value: "መጅሊስ", label: "መጅሊስ" },
    { value: "ቡፌ", label: "ቡፌ" },
  ];

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;

      setLoading(true);
      try {
        const productDoc = doc(FIREBASE_Db, "products", id);
        const productSnapshot = await getDoc(productDoc);
        if (productSnapshot.exists()) {
          const productData = productSnapshot.data() as ProductFormData;
          setFormData(productData);
          if (productData.image && productData.image.length > 0) {
            setImagePreviews(
              Array.isArray(productData.image)
                ? productData.image
                : [productData.image]
            );
          }
        } else {
          toast.error("Product not found");
          router.push("/products");
        }
      } catch (error) {
        toast.error("Failed to fetch product data");
        console.error("Error fetching product:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id, router]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setNewImages(files);
      setHasImageChanged(true);

      // Create previews for new images
      const newPreviews = files.map((file) => URL.createObjectURL(file));
      setImagePreviews((prev) => [...prev, ...newPreviews]);
    }
  };

  const removeImage = (index: number) => {
    setHasImageChanged(true);
    const isExistingImage = index < formData.image.length;

    setImagePreviews((prev) => prev.filter((_, i) => i !== index));

    if (isExistingImage) {
      // If it's an existing image, remove from formData
      setFormData((prev) => ({
        ...prev,
        image: Array.isArray(prev.image)
          ? prev.image.filter((_, i) => i !== index)
          : [],
      }));
    } else {
      // If it's a new image, remove from newImages
      const newIndex = index - formData.image.length;
      setNewImages((prev) => prev.filter((_, i) => i !== newIndex));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!formData.name || !formData.price || !formData.category) {
      toast.error("Please fill in all required fields");
      setLoading(false);
      return;
    }

    if (parseFloat(formData.price) <= 0) {
      toast.error("Price must be a positive number");
      setLoading(false);
      return;
    }

    try {
      let uploadedImageUrls: string[] = [];

      // Only upload new images if they were added
      if (hasImageChanged && newImages.length > 0) {
        uploadedImageUrls = await Promise.all(
          newImages.map(async (image) => {
            const storageRef = ref(
              FIREBASE_Storage,
              `product-images/${Date.now()}-${image.name}`
            );
            await uploadBytes(storageRef, image);
            return await getDownloadURL(storageRef);
          })
        );
      }

      // Determine which images to keep
      const finalImageUrls = hasImageChanged
        ? [...formData.image, ...uploadedImageUrls]
        : formData.image;

      // Update product in Firestore
      const productDoc = doc(FIREBASE_Db, "products", id);
      await updateDoc(productDoc, {
        name: formData.name,
        price: parseFloat(formData.price),
        category: formData.category,
        description: formData.description,
        image: finalImageUrls,
      });

      toast.success("Product updated successfully!");
      setTimeout(() => router.push("/products"), 1000);
    } catch (error) {
      console.error("Error updating product:", error);
      toast.error("Failed to update product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6">Edit Product</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Product Name
            </label>
            <Input
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Product name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Price</label>
            <Input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              placeholder="Product price"
              min="0"
              step="0.01"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full p-2 border rounded-md"
              required
            >
              <option value="">Select a category</option>
              {categories.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full p-2 border rounded-md min-h-[100px]"
              placeholder="Product description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Images</label>
            {imagePreviews.length >= 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative">
                    <img
                      src={preview}
                      alt={`Preview ${index}`}
                      className="w-20 h-20 object-cover rounded-md"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <Input
              type="file"
              onChange={handleFileChange}
              accept="image/*"
              multiple
              className="cursor-pointer"
            />
            <p className="text-xs text-gray-500 mt-1">
              {hasImageChanged
                ? "Changes to images will be saved"
                : "Upload new images to add to the existing ones"}
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/products")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update Product"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

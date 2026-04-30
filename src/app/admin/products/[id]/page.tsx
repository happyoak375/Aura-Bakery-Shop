'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Save, Image as ImageIcon, UploadCloud, Loader2 } from 'lucide-react';
import { Cormorant_Garamond } from 'next/font/google';

import { db, storage } from '../../../../lib/firebase'; // <-- Added storage
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'; // <-- Added storage functions
import { fetchProductById } from '../../../../lib/api';
import { AvailabilityType, ProductVariant, ProductPreference } from '../../../../lib/mockData';

const cormorant = Cormorant_Garamond({
    subsets: ["latin"],
    weight: ['600']
});

export default function EditProductPage() {
    const router = useRouter();
    const params = useParams();

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // --- ESTADO DE SUBIDA DE IMAGEN ---
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    // --- ESTADO DEL FORMULARIO ---
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [basePrice, setBasePrice] = useState<number | ''>('');
    const [category, setCategory] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [availabilityType, setAvailabilityType] = useState<AvailabilityType>('24h');
    const [isActive, setIsActive] = useState(true);

    const [variants, setVariants] = useState<ProductVariant[]>([]);
    const [preferences, setPreferences] = useState<ProductPreference[]>([]);

    // ==========================================
    // CARGAR DATOS INICIALES
    // ==========================================
    useEffect(() => {
        const loadProductData = async () => {
            if (!params.id) return;

            const product = await fetchProductById(params.id as string);

            if (product) {
                // Poblamos el formulario con los datos existentes
                setName(product.name);
                setDescription(product.description);
                setBasePrice(product.basePrice);
                setCategory(product.category);
                setImageUrl(product.imageUrl);
                setAvailabilityType(product.availabilityType);
                setIsActive(product.isActive);
                setVariants(product.variants || []);
                setPreferences(product.preferences || []);
            } else {
                alert("Producto no encontrado. Serás redirigido al inventario.");
                router.push('/admin/products');
            }
            setIsLoading(false);
        };

        loadProductData();
    }, [params.id, router]);

    // ==========================================
    // MANEJADORES DE IMAGEN
    // ==========================================
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);

        // Creamos una referencia única para el archivo en Storage
        const fileRef = ref(storage, `products/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(fileRef, file);

        uploadTask.on(
            'state_changed',
            (snapshot) => {
                // Calculamos el progreso
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setUploadProgress(progress);
            },
            (error) => {
                console.error("Error al subir la imagen:", error);
                alert("Hubo un error al subir la imagen. Por favor intenta de nuevo.");
                setIsUploading(false);
            },
            async () => {
                // Cuando termina, obtenemos la URL pública
                const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
                setImageUrl(downloadUrl);
                setIsUploading(false);
                setUploadProgress(0);
            }
        );
    };

    // ==========================================
    // MANEJADORES DE VARIANTES Y PREFERENCIAS
    // ==========================================
    const addVariant = () => {
        setVariants([...variants, { id: `v_${Date.now()}`, name: '', price_delta: 0 }]);
    };

    const updateVariant = (index: number, field: keyof ProductVariant, value: string | number) => {
        const newVariants = [...variants];
        newVariants[index] = { ...newVariants[index], [field]: value };
        setVariants(newVariants);
    };

    const removeVariant = (index: number) => {
        setVariants(variants.filter((_, i) => i !== index));
    };

    const addPreference = () => {
        setPreferences([...preferences, { id: `p_${Date.now()}`, name: '', price_delta: 0 }]);
    };

    const updatePreference = (index: number, field: keyof ProductPreference, value: string | number) => {
        const newPrefs = [...preferences];
        newPrefs[index] = { ...newPrefs[index], [field]: value };
        setPreferences(newPrefs);
    };

    const removePreference = (index: number) => {
        setPreferences(preferences.filter((_, i) => i !== index));
    };

    // ==========================================
    // ACTUALIZAR EN FIREBASE
    // ==========================================
    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();

        // Prevent saving if an image is currently uploading
        if (isUploading) {
            alert("Por favor espera a que la imagen termine de subir.");
            return;
        }

        setIsSaving(true);

        try {
            const productRef = doc(db, 'products', params.id as string);

            // Usamos updateDoc para solo sobrescribir los campos que enviamos,
            // manteniendo intacto el createdAt original y su ID.
            await updateDoc(productRef, {
                name,
                description,
                basePrice: Number(basePrice),
                category,
                imageUrl,
                availabilityType,
                isActive,
                variants,
                preferences,
                updatedAt: new Date().toISOString(),
            });

            router.push('/admin/products');
        } catch (error) {
            console.error("Error updating product:", error);
            alert("Hubo un error al guardar los cambios.");
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 text-zinc-400 font-medium">
                cargando detalles del producto...
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-8 py-10 font-sans pb-32">

            {/* --- HEADER --- */}
            <div className="flex items-center gap-4 mb-8">
                <Link
                    href="/admin/products"
                    className="w-10 h-10 bg-white border border-gray-200 rounded-full flex items-center justify-center text-zinc-500 hover:text-black hover:border-black transition-colors"
                >
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <h1 className={`text-3xl text-zinc-900 ${cormorant.className}`}>Editar Producto</h1>
                    <p className="text-zinc-500 text-sm mt-1">ID: {params.id}</p>
                </div>
            </div>

            <form onSubmit={handleUpdate} className="space-y-8">

                {/* --- SECCIÓN 1: INFORMACIÓN BÁSICA --- */}
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                    <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest border-b border-gray-50 pb-4">información general</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5 md:col-span-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">nombre del producto *</label>
                            <input
                                type="text" required value={name} onChange={(e) => setName(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                            />
                        </div>

                        <div className="space-y-1.5 md:col-span-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">descripción *</label>
                            <textarea
                                required value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
                                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all resize-none"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">precio base ($) *</label>
                            <input
                                type="number" required min="0" value={basePrice} onChange={(e) => setBasePrice(Number(e.target.value))}
                                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">categoría *</label>
                            <input
                                type="text" required value={category} onChange={(e) => setCategory(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* --- SECCIÓN 2: LOGÍSTICA E IMAGEN --- */}
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                    <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest border-b border-gray-50 pb-4">logística e imagen</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">tiempo de preparación *</label>
                            <select
                                value={availabilityType} onChange={(e) => setAvailabilityType(e.target.value as AvailabilityType)}
                                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all cursor-pointer"
                            >
                                <option value="asap">para hoy (asap)</option>
                                <option value="24h">requiere 24h</option>
                                <option value="48h">requiere 48h</option>
                                <option value="advisor_only">solo asesor (whatsapp)</option>
                            </select>
                        </div>

                        {/* --- UPLOADER COMPONENT --- */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                foto del producto <ImageIcon size={14} />
                            </label>

                            <div className="flex items-center gap-4">
                                {imageUrl && (
                                    <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden relative flex-shrink-0 border border-gray-200">
                                        <img src={imageUrl} alt="Preview" className="object-cover w-full h-full" />
                                    </div>
                                )}

                                <div className="flex-1 relative">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        disabled={isUploading}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                                    />
                                    <div className={`w-full bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl px-4 py-3 flex items-center justify-center transition-all ${isUploading ? 'opacity-50' : 'hover:bg-gray-100 hover:border-gray-300'}`}>
                                        {isUploading ? (
                                            <div className="flex items-center gap-2 text-zinc-500 text-sm font-bold">
                                                <Loader2 size={16} className="animate-spin" /> subiendo... {Math.round(uploadProgress)}%
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-zinc-500 text-sm font-bold">
                                                <UploadCloud size={18} /> {imageUrl ? 'cambiar imagen' : 'subir imagen'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="md:col-span-2 pt-2">
                            <label className="flex items-center gap-3 cursor-pointer p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                                <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${isActive ? 'bg-black border-black' : 'border-gray-300'}`}>
                                    {isActive && <div className="w-2.5 h-2.5 bg-white rounded-sm" />}
                                </div>
                                <div>
                                    <p className="font-bold text-zinc-900 text-sm">producto activo</p>
                                    <p className="text-xs text-zinc-500">si lo desmarcas, se ocultará de la tienda inmediatamente.</p>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>

                {/* --- SECCIÓN 3: VARIANTES DINÁMICAS --- */}
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                    <div className="flex items-center justify-between border-b border-gray-50 pb-4">
                        <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">variantes (tamaños / opciones)</h2>
                        <button type="button" onClick={addVariant} className="text-xs font-bold bg-zinc-100 hover:bg-zinc-200 text-zinc-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors">
                            <Plus size={14} /> agregar variante
                        </button>
                    </div>

                    {variants.length === 0 ? (
                        <p className="text-sm text-zinc-400 text-center py-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                            no hay variantes. el producto se venderá con el precio base.
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {variants.map((variant, index) => (
                                <div key={variant.id} className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                    <input
                                        type="text" placeholder="nombre (ej: porción)" required value={variant.name} onChange={(e) => updateVariant(index, 'name', e.target.value)}
                                        className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-black"
                                    />
                                    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 w-32 focus-within:border-black transition-colors">
                                        <span className="text-zinc-400 text-sm">$+</span>
                                        <input
                                            type="number" placeholder="0" min="0" required value={variant.price_delta} onChange={(e) => updateVariant(index, 'price_delta', Number(e.target.value))}
                                            className="w-full bg-transparent text-sm outline-none"
                                        />
                                    </div>
                                    <button type="button" onClick={() => removeVariant(index)} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* --- STICKY FOOTER ACTION --- */}
                <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 p-4 z-40 shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
                    <div className="max-w-4xl mx-auto flex justify-end">
                        <button
                            type="submit"
                            disabled={isSaving || isUploading}
                            className="bg-black text-white px-8 py-3.5 rounded-full font-bold flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all active:scale-95 shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isSaving ? 'guardando...' : <><Save size={18} /> guardar cambios</>}
                        </button>
                    </div>
                </div>

            </form>
        </div>
    );
}

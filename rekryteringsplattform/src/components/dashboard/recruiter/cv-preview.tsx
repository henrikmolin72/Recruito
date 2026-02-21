"use client";

import { useState } from "react";
import { FileText, X, Eye, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/i18n/client";

export function CVPreview() {
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const { t } = useTranslations();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            if (selectedFile.type === "application/pdf") {
                const url = URL.createObjectURL(selectedFile);
                setPreviewUrl(url);
            } else {
                setPreviewUrl(null);
            }
        }
    };

    const clearFile = () => {
        setFile(null);
        setPreviewUrl(null);
    };

    return (
        <div className="space-y-4">
            {!file ? (
                <div className="group relative">
                    <input
                        type="file"
                        name="cv_file"
                        accept=".pdf,.doc,.docx"
                        required
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 transition-all group-hover:border-brand-300 group-hover:bg-brand-50/30 flex flex-col items-center justify-center text-center">
                        <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                            <FileText className="h-6 w-6 text-slate-400 group-hover:text-brand-500" />
                        </div>
                        <p className="text-sm font-bold text-slate-600">{t("components.cvUploadLabel")}</p>
                        <p className="text-xs text-slate-400 mt-1">{t("components.cvUploadHint")}</p>
                    </div>
                </div>
            ) : (
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center">
                                <FileCheck className="h-5 w-5 text-success-500" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-700 truncate max-w-[200px]">{file.name}</p>
                                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">
                                    {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type.split('/')[1].toUpperCase()}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {previewUrl && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => window.open(previewUrl, '_blank')}
                                    className="h-8 px-3 rounded-lg text-slate-500 hover:text-brand-600"
                                >
                                    <Eye className="h-4 w-4 mr-2" /> {t("components.cvPreviewReview")}
                                </Button>
                            )}
                            <button
                                type="button"
                                onClick={clearFile}
                                className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-400 transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

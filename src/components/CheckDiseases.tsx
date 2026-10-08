
import { useState, type ChangeEvent } from 'react';

import {
    Camera,
    Images,
    Leaf,
    Loader2,
    ScanSearch,
    RotateCcw,
    AlertCircle,
    CheckCircle2,
    XCircle,
    HelpCircle,
    Languages,
    Bug,
    Microscope,
    Gauge,
    ClipboardList,
} from 'lucide-react';

type Language = 'en' | 'si' | 'ta';
type ImageSource = 'camera' | 'gallery' | null;

interface ReportSection {
    title: string;
    content: string;
}

const SECTION_KEYS = [
    'HEALTH STATUS',
    'DISEASE NAME',
    'SYMPTOMS OBSERVED',
    'CONFIDENCE LEVEL',
    'RECOMMENDED ACTION',
] as const;

// ========================================
// PARSE AI ANALYSIS REPORT
// ========================================

function parseReport(raw: string): ReportSection[] {
    const cleaned = raw
        .replace(/\*\*/g, '')
        .replace(/#{1,6}\s*/g, '')
        .replace(/-{3,}/g, '\n');

    const pattern = new RegExp(
        `(?:\\d+\\.\\s*)?(${SECTION_KEYS.join('|')})\\s*:\\s*`,
        'gi'
    );

    const matches = [...cleaned.matchAll(pattern)];

    if (!matches.length) {
        return [
            {
                title: 'ANALYSIS REPORT',
                content: cleaned.trim(),
            },
        ];
    }

    return matches.map((match, index) => ({
        title: match[1].toUpperCase(),
        content: cleaned
            .slice(
                (match.index ?? 0) + match[0].length,
                index + 1 < matches.length
                    ? matches[index + 1].index
                    : undefined
            )
            .trim(),
    }));
}

// ========================================
// SPLIT TEXT INTO BULLETS
// ========================================

function splitIntoBullets(content: string): string[] {
    let items = content
        .split(/\n|(?:^|\s)[•*]\s+/)
        .map(item => item.trim())
        .filter(Boolean);

    if (items.length <= 1) {
        items = content
            .split(/(?<=\.)\s+(?=[A-Z])/)
            .map(item => item.trim())
            .filter(Boolean);
    }

    return items.map(item =>
        item
            .replace(/^\d+[.)]\s*/, '')
            .replace(/^[•*-]\s*/, '')
            .trim()
    );
}

// ========================================
// IMAGE COMPRESSION
// ========================================

function compressImage(dataUrl: string): Promise<string> {
    return new Promise(resolve => {
        const img = new Image();

        img.onload = () => {
            let { width, height } = img;

            const maxDimension = 1024;

            if (width > height && width > maxDimension) {
                height = Math.round(
                    (height * maxDimension) / width
                );
                width = maxDimension;
            } else if (height > maxDimension) {
                width = Math.round(
                    (width * maxDimension) / height
                );
                height = maxDimension;
            }

            const canvas = document.createElement('canvas');

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');

            if (!ctx) {
                resolve(dataUrl);
                return;
            }

            ctx.drawImage(img, 0, 0, width, height);

            resolve(canvas.toDataURL('image/jpeg', 0.75));
        };

        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
    });
}

// ========================================
// GEMINI API WITH RETRY + ERROR HANDLING
// ========================================

async function callGeminiWithRetry(
    body: Record<string, unknown>,
    maxRetries = 4
): Promise<string> {
    const apiKey = (
        import.meta.env.VITE_GEMINI_API_KEY || ''
    ).trim();

    if (!apiKey) {
        throw new Error(
            'Gemini API key is missing. Please configure VITE_GEMINI_API_KEY in your .env file.'
        );
    }


    const model = 'gemini-3.8-flash';


    const url =
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        let response: Response;

        try {
            response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': apiKey,
                },
                body: JSON.stringify(body),
            });
        } catch (error) {
            console.error('Gemini Network Error:', error);

            if (attempt < maxRetries) {
                await new Promise(resolve =>
                    setTimeout(resolve, 2000 * 2 ** attempt)
                );
                continue;
            }

            throw new Error(
                'Cannot connect to Gemini API. Check your internet connection, browser extensions, firewall, or CORS errors in DevTools.'
            );
        }

        const result = await response
            .json()
            .catch(() => null);

        if (!response.ok) {
            const message =
                result?.error?.message ||
                `Request failed with HTTP ${response.status}`;

            console.error('Gemini API Error:', {
                status: response.status,
                message,
            });

            if (
                [429, 500, 502, 503, 504].includes(response.status) &&
                attempt < maxRetries
            ) {
                await new Promise(resolve =>
                    setTimeout(resolve, 1000 * 2 ** attempt)
                );
                continue;
            }

            throw new Error(
                `Gemini API Error (${response.status}): ${message}`
            );
        }

        const text = (
            result?.candidates?.[0]?.content?.parts || []
        )
            .map((part: { text?: string }) => part.text || '')
            .join('\n')
            .trim();

        if (!text) {
            const reason =
                result?.candidates?.[0]?.finishReason ||
                result?.promptFeedback?.blockReason ||
                'No text returned';

            throw new Error(
                `Gemini returned no analysis: ${reason}`
            );
        }

        return text;
    }

    throw new Error(
        'Gemini API request failed after multiple attempts.'
    );
}

// ========================================
// MAIN CHECK DISEASES COMPONENT
// ========================================

export function CheckDiseases() {
    const [capturedImage, setCapturedImage] =
        useState<string | null>(null);

    const [imageSource, setImageSource] =
        useState<ImageSource>(null);

    const [analyzing, setAnalyzing] = useState(false);

    const [analysisResult, setAnalysisResult] =
        useState<string | null>(null);

    const [analysisError, setAnalysisError] = useState('');

    const [reportLang, setReportLang] =
        useState<Language>('en');

    const [translatedReports, setTranslatedReports] =
        useState<Partial<Record<'si' | 'ta', string>>>({});

    const [translating, setTranslating] = useState(false);

    // ========================================
    // RESET IMAGE ANALYSIS
    // ========================================

    const reset = () => {
        setCapturedImage(null);
        setImageSource(null);
        setAnalysisResult(null);
        setAnalysisError('');
        setReportLang('en');
        setTranslatedReports({});
    };

    // ========================================
    // SELECT CAMERA / GALLERY IMAGE
    // ========================================

    const handleImageSelect = (
        event: ChangeEvent<HTMLInputElement>,
        source: 'camera' | 'gallery'
    ) => {
        const file = event.target.files?.[0];

        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setAnalysisError('Please select a valid image file.');
            return;
        }

        reset();
        setImageSource(source);

        const reader = new FileReader();

        reader.onload = async () => {
            const original = reader.result;

            if (typeof original !== 'string') {
                setAnalysisError('Could not read the image.');
                return;
            }

            try {
                const compressed = await compressImage(original);
                setCapturedImage(compressed);
            } catch (error) {
                console.error('Image compression error:', error);
                setCapturedImage(original);
            }
        };

        reader.onerror = () => {
            setAnalysisError(
                'Could not read the selected image. Please try again.'
            );
        };

        reader.readAsDataURL(file);
        event.target.value = '';
    };

    // ========================================
    // ANALYZE PADDY HEALTH
    // ========================================

    const analyze = async () => {
        if (!capturedImage || analyzing) return;

        setAnalyzing(true);
        setAnalysisError('');
        setAnalysisResult(null);

        try {
            const base64Data = capturedImage.split(',')[1];

            if (!base64Data) {
                throw new Error(
                    'Invalid image data. Please select another image.'
                );
            }

            const result = await callGeminiWithRetry({
                contents: [
                    {
                        parts: [
                            {
                                text: `You are an expert agricultural plant pathologist specializing in paddy (rice) crops.

Carefully analyze the uploaded image and generate a detailed paddy health report.

Use exactly these five section headings:

1. HEALTH STATUS:
State Healthy, Diseased, or Unclear.

2. DISEASE NAME:
Identify the most likely disease if visible.
If healthy, write None.
If uncertain, explain the uncertainty.

3. SYMPTOMS OBSERVED:
Describe visible symptoms such as:
- Leaf discoloration
- Brown or yellow spots
- Leaf blight
- Wilting
- Lesions
- Other visible abnormalities

4. CONFIDENCE LEVEL:
State High, Medium, or Low and explain why.
This is a qualitative visual assessment, not a measured probability.

5. RECOMMENDED ACTION:
Provide practical advice for farmers.
Explain what to check next and suitable preventive measures.
Avoid recommending a specific pesticide without confirming the diagnosis.

IMPORTANT:
If the image does not clearly show a paddy plant,
state that the image is unclear or not a paddy plant.
Do not invent a disease diagnosis.

Respond in clear English.`,
                            },
                            {
                                inline_data: {
                                    mime_type: 'image/jpeg',
                                    data: base64Data,
                                },
                            },
                        ],
                    },
                ],
            });

            setAnalysisResult(result);
            setReportLang('en');
            setTranslatedReports({});
        } catch (error) {
            console.error('Paddy Analysis Error:', error);

            setAnalysisError(
                error instanceof Error
                    ? error.message
                    : 'Failed to analyze the image. Please try again.'
            );
        } finally {
            setAnalyzing(false);
        }
    };

    // ========================================
    // TRANSLATE ANALYSIS REPORT
    // ========================================

    const changeLanguage = async (lang: Language) => {
        if (lang === 'en') {
            setReportLang('en');
            return;
        }

        if (!analysisResult) return;

        if (translatedReports[lang]) {
            setReportLang(lang);
            return;
        }

        setTranslating(true);
        setAnalysisError('');

        try {
            const languageName =
                lang === 'si' ? 'Sinhala' : 'Tamil';

            const translation = await callGeminiWithRetry({
                contents: [
                    {
                        parts: [
                            {
                                text: `Translate the following paddy plant disease report into natural, easy-to-understand ${languageName} for Sri Lankan farmers.

Keep these section headings exactly in English:

HEALTH STATUS:
DISEASE NAME:
SYMPTOMS OBSERVED:
CONFIDENCE LEVEL:
RECOMMENDED ACTION:

Translate the descriptions, explanations and recommendations into ${languageName}.

Preserve the original report meaning.
Do not add extra information.

REPORT:

${analysisResult}`,
                            },
                        ],
                    },
                ],
            });

            setTranslatedReports(prev => ({
                ...prev,
                [lang]: translation,
            }));

            setReportLang(lang);
        } catch (error) {
            console.error('Translation Error:', error);

            setAnalysisError(
                error instanceof Error
                    ? error.message
                    : 'Failed to translate the report.'
            );
        } finally {
            setTranslating(false);
        }
    };

    // ========================================
    // REPORT DISPLAY
    // ========================================

    const displayedReport =
        reportLang === 'en'
            ? analysisResult
            : translatedReports[reportLang] || analysisResult;

    const englishSections = parseReport(analysisResult || '');

    const englishStatus = (
        englishSections.find(
            section => section.title === 'HEALTH STATUS'
        )?.content || ''
    ).toLowerCase();

    const englishConfidence = (
        englishSections.find(
            section => section.title === 'CONFIDENCE LEVEL'
        )?.content || ''
    ).toLowerCase();

    const isDiseased = englishStatus.includes('diseased');

    const isHealthy =
        !isDiseased && englishStatus.includes('healthy');

    const confidenceLabel =
        englishConfidence.includes('high')
            ? 'High'
            : englishConfidence.includes('medium')
                ? 'Medium'
                : englishConfidence.includes('low')
                    ? 'Low'
                    : null;

    const sections = parseReport(displayedReport || '');

    const healthSection = sections.find(
        section => section.title === 'HEALTH STATUS'
    );

    const diseaseSection = sections.find(
        section => section.title === 'DISEASE NAME'
    );

    const symptomsSection = sections.find(
        section => section.title === 'SYMPTOMS OBSERVED'
    );

    const confidenceSection = sections.find(
        section => section.title === 'CONFIDENCE LEVEL'
    );

    const actionSection = sections.find(
        section => section.title === 'RECOMMENDED ACTION'
    );

    const hasStructuredSections = sections.some(
        section => section.title === 'HEALTH STATUS'
    );

    // ========================================
    // UI
    // ========================================

    return (
        <div className="min-h-screen bg-[#f2fbf7] p-4 sm:p-6">
            <div className="mx-auto max-w-5xl space-y-6">

                {/* PAGE TITLE */}
                <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-green-600 p-3 text-white">
                        <Leaf className="h-7 w-7" />
                    </div>

                    <div>
                        <h1 className="text-2xl font-bold text-green-950 sm:text-3xl">
                            Check Diseases
                        </h1>

                        <p className="text-sm text-gray-500">
                            Paddy leaf health analysis using your camera or gallery
                        </p>
                    </div>
                </div>

                {/* CAMERA AND GALLERY */}
                <div className="grid gap-4 md:grid-cols-2">

                    <label className="flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-green-300 bg-white p-8 text-center shadow-sm transition hover:bg-green-50">
                        <Camera className="mb-3 h-10 w-10 text-green-600" />

                        <span className="font-semibold text-green-900">
                            Take a Photo
                        </span>

                        <span className="mt-1 text-sm text-gray-500">
                            Use your device camera
                        </span>

                        <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            disabled={analyzing || translating}
                            onChange={event =>
                                handleImageSelect(event, 'camera')
                            }
                        />
                    </label>

                    <label className="flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-green-300 bg-white p-8 text-center shadow-sm transition hover:bg-green-50">
                        <Images className="mb-3 h-10 w-10 text-green-600" />

                        <span className="font-semibold text-green-900">
                            Choose from Gallery
                        </span>

                        <span className="mt-1 text-sm text-gray-500">
                            Select a paddy leaf image
                        </span>

                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={analyzing || translating}
                            onChange={event =>
                                handleImageSelect(event, 'gallery')
                            }
                        />
                    </label>
                </div>

                {/* SELECTED IMAGE */}
                {capturedImage && (
                    <div className="rounded-2xl border border-green-100 bg-white p-5 shadow-sm">
                        <h2 className="mb-3 text-lg font-bold text-green-950">
                            Selected Leaf Image
                        </h2>

                        <img
                            src={capturedImage}
                            alt="Selected paddy leaf"
                            className="max-h-80 w-full rounded-xl bg-green-50 object-contain"
                        />

                        <p className="mt-2 text-center text-xs text-gray-500">
                            Source:{' '}
                            {imageSource === 'camera' ? 'Camera' : 'Gallery'}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={analyze}
                                disabled={analyzing || translating}
                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                            >
                                {analyzing ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <ScanSearch className="h-5 w-5" />
                                )}

                                {analyzing
                                    ? 'Analyzing...'
                                    : 'Analyze Paddy Health'}
                            </button>

                            <button
                                type="button"
                                onClick={reset}
                                disabled={analyzing || translating}
                                className="inline-flex items-center gap-2 rounded-xl border border-green-200 px-5 py-3 text-green-800 hover:bg-green-50 disabled:opacity-50"
                            >
                                <RotateCcw className="h-4 w-4" />
                                Reset
                            </button>
                        </div>
                    </div>
                )}

                {/* ERROR MESSAGE */}
                {analysisError && (
                    <div
                        role="alert"
                        className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                    >
                        <AlertCircle className="h-5 w-5 shrink-0" />
                        <span>{analysisError}</span>
                    </div>
                )}

                {/* DISEASE DETECTION RESULTS */}
                <div className="rounded-2xl border border-green-100 bg-white p-5 shadow-sm">

                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h2 className="flex items-center gap-2 text-lg font-bold text-green-950">
                            <ScanSearch className="h-5 w-5 text-green-600" />
                            Disease Detection Results
                        </h2>

                        {/* LANGUAGE SWITCHER */}
                        {analysisResult && (
                            <div className="flex flex-wrap items-center gap-2">
                                <Languages className="h-4 w-4 text-green-700" />

                                {(['en', 'si', 'ta'] as const).map(lang => (
                                    <button
                                        key={lang}
                                        type="button"
                                        disabled={translating || analyzing}
                                        onClick={() => void changeLanguage(lang)}
                                        className={`rounded-full border px-3 py-1 text-xs transition-colors ${reportLang === lang
                                            ? 'border-green-600 bg-green-600 text-white'
                                            : 'border-green-200 bg-white text-green-700 hover:bg-green-50'
                                            } disabled:opacity-50`}
                                    >
                                        {lang === 'en'
                                            ? 'English'
                                            : lang === 'si'
                                                ? 'සිංහල'
                                                : 'தமிழ்'}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* TRANSLATING */}
                    {translating && (
                        <p className="mt-3 flex items-center gap-2 text-sm text-green-700">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Translating report...
                        </p>
                    )}

                    {/* NO RESULTS */}
                    {!analysisResult ? (
                        <div className="mt-5 rounded-xl border border-dashed border-green-200 bg-green-50 p-8 text-center">
                            <Leaf className="mx-auto h-9 w-9 text-green-500" />

                            <p className="mt-3 text-sm text-green-800">
                                Select a paddy leaf image and click
                                Analyze Paddy Health to see your report.
                            </p>
                        </div>
                    ) : (
                        <div className="mt-5 space-y-3">

                            {/* HEALTH SUMMARY */}
                            <div
                                className={`flex items-center gap-3 rounded-xl p-4 ${isDiseased
                                    ? 'bg-red-50 text-red-700'
                                    : isHealthy
                                        ? 'bg-green-50 text-green-700'
                                        : 'bg-amber-50 text-amber-700'
                                    }`}
                            >
                                {isDiseased ? (
                                    <XCircle className="h-6 w-6 shrink-0" />
                                ) : isHealthy ? (
                                    <CheckCircle2 className="h-6 w-6 shrink-0" />
                                ) : (
                                    <HelpCircle className="h-6 w-6 shrink-0" />
                                )}

                                <div className="flex-1">
                                    <p className="font-semibold">
                                        {isDiseased
                                            ? 'Possible Disease Detected'
                                            : isHealthy
                                                ? 'Plant Appears Healthy'
                                                : 'Result Needs Review'}
                                    </p>

                                    {healthSection?.content && (
                                        <p className="mt-1 text-sm">
                                            {healthSection.content}
                                        </p>
                                    )}
                                </div>

                                {confidenceLabel && (
                                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold">
                                        {confidenceLabel} Confidence
                                    </span>
                                )}
                            </div>

                            {/* STRUCTURED REPORT */}
                            {hasStructuredSections ? (
                                <>
                                    {/* DISEASE NAME */}
                                    {diseaseSection?.content && (
                                        <div className="rounded-xl border border-green-100 bg-green-50/50 p-4">
                                            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-green-800">
                                                <Bug className="h-4 w-4" />
                                                Disease Name
                                            </h3>

                                            <p className="whitespace-pre-wrap text-sm leading-7 text-gray-700">
                                                {diseaseSection.content}
                                            </p>
                                        </div>
                                    )}

                                    {/* SYMPTOMS */}
                                    {symptomsSection?.content && (
                                        <div className="rounded-xl border border-green-100 bg-green-50/50 p-4">
                                            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-green-800">
                                                <Microscope className="h-4 w-4" />
                                                Symptoms Observed
                                            </h3>

                                            <ul className="space-y-2">
                                                {splitIntoBullets(
                                                    symptomsSection.content
                                                ).map((item, index) => (
                                                    <li
                                                        key={index}
                                                        className="flex items-start gap-2 text-sm leading-6 text-gray-700"
                                                    >
                                                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                                                        <span>{item}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* CONFIDENCE */}
                                    {confidenceSection?.content && (
                                        <div className="rounded-xl border border-green-100 bg-green-50/50 p-4">
                                            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-green-800">
                                                <Gauge className="h-4 w-4" />
                                                Confidence Level
                                            </h3>

                                            <p className="whitespace-pre-wrap text-sm leading-7 text-gray-700">
                                                {confidenceSection.content}
                                            </p>
                                        </div>
                                    )}

                                    {/* RECOMMENDED ACTION */}
                                    {actionSection?.content && (
                                        <div className="rounded-xl border border-green-100 bg-green-50/50 p-4">
                                            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-green-800">
                                                <ClipboardList className="h-4 w-4" />
                                                Recommended Action
                                            </h3>

                                            <ol className="space-y-3">
                                                {splitIntoBullets(
                                                    actionSection.content
                                                ).map((item, index) => (
                                                    <li
                                                        key={index}
                                                        className="flex items-start gap-3 text-sm leading-6 text-gray-700"
                                                    >
                                                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-600 text-xs font-semibold text-white">
                                                            {index + 1}
                                                        </span>

                                                        <span>{item}</span>
                                                    </li>
                                                ))}
                                            </ol>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="rounded-xl border border-green-100 bg-green-50/50 p-4">
                                    <h3 className="mb-2 text-sm font-bold text-green-800">
                                        Analysis Report
                                    </h3>

                                    <p className="whitespace-pre-wrap text-sm leading-7 text-gray-700">
                                        {displayedReport}
                                    </p>
                                </div>
                            )}

                            <p className="text-xs text-gray-500">
                                AI image analysis can be inaccurate.
                                Confirm serious crop disease concerns
                                with an agricultural specialist.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

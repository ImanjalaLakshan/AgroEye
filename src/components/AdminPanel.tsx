import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import {
  Database,
  Users,
  FileImage,
  FileSpreadsheet,
  Trash2,
  UserPlus,
  MoreVertical,
  Search,
  Settings,
  LogOut,
  Sprout,
  MapPin,
  Plus,
  Camera,
  Images,
  Loader2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Bug,
  Microscope,
  Gauge,
  ClipboardList,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

import { db, secondaryAuth } from '../firebase';

import {
  ref,
  onValue,
  push,
  remove,
  set,
  update,
} from 'firebase/database';

import {
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from 'firebase/auth';

import emailjs from '@emailjs/browser';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Dataset {
  id: string;
  name: string;
  type: 'image' | 'csv';
  size: string;
  records: number;
  uploadedBy: string;
  status: 'active' | 'processing' | 'archived';
}

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'user';
  status: 'active' | 'inactive';
  lastLogin: string;
  fields: number;
}

interface FieldRecord {
  id: string;
  name: string;
  location: string;
  assignedTo: string;
  assignedToName: string;
}

/* =========================================================
   Paddy Analysis Helpers
========================================================= */

const ANALYSIS_SECTION_KEYS = [
  'HEALTH STATUS',
  'DISEASE NAME',
  'SYMPTOMS OBSERVED',
  'CONFIDENCE LEVEL',
  'RECOMMENDED ACTION',
];

interface AnalysisSection {
  key: string;
  content: string;
}

function parseAnalysisText(raw: string): AnalysisSection[] {
  const text = raw
    .replace(/\*\*/g, '')
    .replace(/#{1,6}\s*/g, '')
    .replace(/-{3,}/g, '\n');

  const pattern = new RegExp(
    `(?:\\d+\\.\\s*)?(${ANALYSIS_SECTION_KEYS.join('|')})\\s*: ?`,
    'gi'
  );

  const matches: {
    key: string;
    start: number;
    end: number;
  }[] = [];

  let m: RegExpExecArray | null;

  while ((m = pattern.exec(text)) !== null) {
    matches.push({
      key: m[1].toUpperCase(),
      start: m.index,
      end: pattern.lastIndex,
    });
  }

  if (matches.length === 0) {
    return [
      {
        key: 'RAW',
        content: text.trim(),
      },
    ];
  }

  const sections: AnalysisSection[] = [];

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].end;
    const end =
      i + 1 < matches.length
        ? matches[i + 1].start
        : text.length;

    sections.push({
      key: matches[i].key,
      content: text.slice(start, end).trim(),
    });
  }

  return sections;
}

function splitIntoBullets(content: string): string[] {
  let items = content
    .split(/\*\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (items.length <= 1) {
    items = content
      .split(/(?<=\.)\s+(?=[A-Z])/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return items.map((s) =>
    s
      .replace(/^\d+\.\s*/, '')
      .replace(/^[:•-]\s*/, '')
  );
}

/* =========================================================
   Admin Panel
========================================================= */

export function AdminPanel() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [fields, setFields] = useState<FieldRecord[]>([]);

  const [searchDataset, setSearchDataset] = useState('');
  const [searchUser, setSearchUser] = useState('');
  const [searchField, setSearchField] = useState('');

  const [isUploadImageOpen, setIsUploadImageOpen] = useState(false);
  const [isUploadCsvOpen, setIsUploadCsvOpen] = useState(false);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isAddFieldOpen, setIsAddFieldOpen] = useState(false);

  /* =========================================================
     Form States
  ========================================================= */

  const [datasetName, setDatasetName] = useState('');

  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] =
    useState<'admin' | 'manager' | 'user'>('user');
  const [newUserPassword, setNewUserPassword] = useState('');

  const [userError, setUserError] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);

  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldLocation, setNewFieldLocation] = useState('');

  const [emailStatus, setEmailStatus] = useState('');

  /* =========================================================
     Paddy Disease Analysis
  ========================================================= */

  const [capturedImage, setCapturedImage] =
    useState<string | null>(null);

  const [imageSource, setImageSource] =
    useState<'camera' | 'gallery' | null>(null);

  const [analyzing, setAnalyzing] = useState(false);

  const [analysisResult, setAnalysisResult] =
    useState<string | null>(null);

  const [analysisError, setAnalysisError] = useState('');

  /* =========================================================
     Report Translation
  ========================================================= */

  const [reportLang, setReportLang] =
    useState<'en' | 'si' | 'ta'>('en');

  const [translatedReports, setTranslatedReports] =
    useState<{
      si?: string;
      ta?: string;
    }>({});

  const [translating, setTranslating] = useState(false);

  /* =========================================================
     Gemini API
     
     IMPORTANT:
     API key is loaded from .env instead of being hard-coded.
  ========================================================= */

  const GEMINI_API_KEY =
    import.meta.env.VITE_GEMINI_API_KEY || '';

  /* =========================================================
     Image Compression
  ========================================================= */

  const MAX_IMAGE_DIMENSION = 1024;
  const IMAGE_QUALITY = 0.75;

  const compressImage = (
    dataUrl: string
  ): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();

      img.onload = () => {
        let { width, height } = img;

        if (
          width > height &&
          width > MAX_IMAGE_DIMENSION
        ) {
          height = Math.round(
            (height * MAX_IMAGE_DIMENSION) / width
          );

          width = MAX_IMAGE_DIMENSION;
        } else if (
          height > MAX_IMAGE_DIMENSION
        ) {
          width = Math.round(
            (width * MAX_IMAGE_DIMENSION) / height
          );

          height = MAX_IMAGE_DIMENSION;
        }

        const canvas =
          document.createElement('canvas');

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        ctx.drawImage(
          img,
          0,
          0,
          width,
          height
        );

        resolve(
          canvas.toDataURL(
            'image/jpeg',
            IMAGE_QUALITY
          )
        );
      };

      img.onerror = () => {
        resolve(dataUrl);
      };

      img.src = dataUrl;
    });
  };

  /* =========================================================
     Image Selection
  ========================================================= */

  const handleImageSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    source: 'camera' | 'gallery'
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setAnalysisResult(null);
    setAnalysisError('');
    setImageSource(source);

    const reader = new FileReader();

    reader.onload = async () => {
      const original = reader.result as string;

      try {
        const compressed =
          await compressImage(original);

        setCapturedImage(compressed);
      } catch {
        setCapturedImage(original);
      }
    };

    reader.readAsDataURL(file);

    e.target.value = '';
  };

  /* =========================================================
     Gemini API Call
  ========================================================= */

  const callGeminiWithRetry = async (
    model: string,
    body: Record<string, unknown>,
    maxRetries = 3
  ): Promise<any> => {
    if (!GEMINI_API_KEY) {
      throw new Error(
        'Gemini API key is not configured. Please add VITE_GEMINI_API_KEY to your .env file.'
      );
    }

    let lastError: any = null;

    for (
      let attempt = 0;
      attempt <= maxRetries;
      attempt++
    ) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: 'POST',

            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': GEMINI_API_KEY,
            },

            body: JSON.stringify(body),
          }
        );

        const result = await response.json();

        if (!response.ok) {
          const message =
            result?.error?.message ||
            'Request failed.';

          const isOverloaded =
            response.status === 503 ||
            /overloaded|high demand|unavailable/i.test(
              message
            );

          if (
            isOverloaded &&
            attempt < maxRetries
          ) {
            lastError = new Error(message);

            await new Promise((res) =>
              setTimeout(
                res,
                1000 * Math.pow(2, attempt)
              )
            );

            continue;
          }

          throw new Error(message);
        }

        return result;
      } catch (err: any) {
        if (
          err.message === 'Failed to fetch' &&
          attempt < maxRetries
        ) {
          lastError = err;

          await new Promise((res) =>
            setTimeout(
              res,
              1000 * Math.pow(2, attempt)
            )
          );

          continue;
        }

        throw err;
      }
    }

    throw (
      lastError ||
      new Error(
        'Request failed after multiple attempts.'
      )
    );
  };

  /* =========================================================
     Analyze Paddy Image
  ========================================================= */

  const handleAnalyzeImage = async () => {
    if (!capturedImage) return;

    setAnalyzing(true);
    setAnalysisError('');
    setAnalysisResult(null);

    try {
      const base64Data =
        capturedImage.split(',')[1];

      const result =
        await callGeminiWithRetry(
          'gemini-3.6-flash',
          {
            contents: [
              {
                parts: [
                  {
                    text:
                      'You are an expert agricultural plant pathologist specializing in paddy (rice) crops. Look at this image carefully and give a complete, detailed report with these exact sections:\n\n1. HEALTH STATUS: (Healthy / Diseased / Unclear - state clearly)\n2. DISEASE NAME: (if diseased, name the specific disease; if healthy, write "None")\n3. SYMPTOMS OBSERVED: (describe what you see in the image - leaf spots, discoloration, wilting, etc.)\n4. CONFIDENCE LEVEL: (High / Medium / Low, and briefly why)\n5. RECOMMENDED ACTION: (what the farmer should do next)\n\nBe specific and thorough. If the image does not clearly show a paddy/rice plant, say so clearly instead of guessing.',
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
          }
        );

      const text =
        result?.candidates?.[0]?.content
          ?.parts?.[0]?.text;

      if (!text) {
        throw new Error(
          'No analysis returned. Please try again with a clearer photo.'
        );
      }

      setAnalysisResult(text);
      setReportLang('en');
      setTranslatedReports({});
    } catch (err: any) {
      console.error(err);

      const friendlyMessage =
        err.message === 'Failed to fetch'
          ? 'Network error - could not reach the server. Check your internet connection and try again.'
          : /overloaded|high demand|unavailable/i.test(
              err.message || ''
            )
          ? 'The AI model is busy right now (we already retried automatically). Please wait a moment and try again.'
          : err.message ||
            'Failed to analyze image. Please try again.';

      setAnalysisError(friendlyMessage);
    } finally {
      setAnalyzing(false);
    }
  };

  /* =========================================================
     Translate Report
  ========================================================= */

  const translateReport = async (
    lang: 'si' | 'ta'
  ) => {
    if (!analysisResult) return;

    setTranslating(true);
    setAnalysisError('');

    try {
      const langName =
        lang === 'si'
          ? 'Sinhala'
          : 'Tamil';

      const result =
        await callGeminiWithRetry(
          'gemini-3.6-flash',
          {
            contents: [
              {
                parts: [
                  {
                    text: `Translate the following plant disease report into natural, easy-to-understand ${langName} for a farmer. Keep the section header labels exactly as given, unchanged and in English (HEALTH STATUS:, DISEASE NAME:, SYMPTOMS OBSERVED:, CONFIDENCE LEVEL:, RECOMMENDED ACTION:) so the structure stays intact. Translate everything else - the descriptions, symptom lists, and recommendations - into ${langName}. Keep the same numbering/bullet structure. Do not add any extra commentary before or after the translated report.\n\n${analysisResult}`,
                  },
                ],
              },
            ],
          }
        );

      const text =
        result?.candidates?.[0]?.content
          ?.parts?.[0]?.text;

      if (!text) {
        throw new Error(
          'No translation returned. Please try again.'
        );
      }

      setTranslatedReports((prev) => ({
        ...prev,
        [lang]: text,
      }));

      setReportLang(lang);
    } catch (err: any) {
      console.error(err);

      const friendlyMessage =
        err.message === 'Failed to fetch'
          ? 'Network error - could not reach the server. Check your internet connection and try again.'
          : /overloaded|high demand|unavailable/i.test(
              err.message || ''
            )
          ? 'The AI model is busy right now (we already retried automatically). Please wait a moment and try again.'
          : err.message ||
            'Failed to translate the report. Please try again.';

      setAnalysisError(friendlyMessage);
    } finally {
      setTranslating(false);
    }
  };

  /* =========================================================
     Language Change
  ========================================================= */

  const handleReportLangChange = (
    lang: 'en' | 'si' | 'ta'
  ) => {
    if (lang === 'en') {
      setReportLang('en');
      return;
    }

    if (translatedReports[lang]) {
      setReportLang(lang);
      return;
    }

    translateReport(lang);
  };

  /* =========================================================
     Reset Image Analysis
  ========================================================= */

  const resetImageAnalysis = () => {
    setCapturedImage(null);
    setImageSource(null);
    setAnalysisResult(null);
    setAnalysisError('');
    setReportLang('en');
    setTranslatedReports({});
  };

  /* =========================================================
     Load Datasets
  ========================================================= */

  useEffect(() => {
    const datasetsRef = ref(
      db,
      'datasets'
    );

    const unsub = onValue(
      datasetsRef,
      (snapshot) => {
        const value = snapshot.val();

        if (!value) {
          setDatasets([]);
          return;
        }

        const list: Dataset[] =
          Object.entries(value).map(
            ([id, d]: [string, any]) => ({
              id,
              ...d,
            })
          );

        setDatasets(list);
      }
    );

    return () => unsub();
  }, []);

  /* =========================================================
     Load Users
  ========================================================= */

  useEffect(() => {
    const usersRef = ref(
      db,
      'users'
    );

    const unsub = onValue(
      usersRef,
      (snapshot) => {
        const value = snapshot.val();

        if (!value) {
          setUsers([]);
          return;
        }

        const list: UserRecord[] =
          Object.entries(value).map(
            ([id, u]: [string, any]) => ({
              id,
              ...u,
            })
          );

        setUsers(list);
      }
    );

    return () => unsub();
  }, []);

  /* =========================================================
     Load Fields
  ========================================================= */

  useEffect(() => {
    const fieldsRef = ref(
      db,
      'fields'
    );

    const unsub = onValue(
      fieldsRef,
      (snapshot) => {
        const value = snapshot.val();

        if (!value) {
          setFields([]);
          return;
        }

        const list: FieldRecord[] =
          Object.entries(value).map(
            ([id, f]: [string, any]) => ({
              id,
              ...f,
            })
          );

        setFields(list);
      }
    );

    return () => unsub();
  }, []);

  /* =========================================================
     Filtering
  ========================================================= */

  const filteredDatasets =
    datasets.filter(
      (dataset) =>
        dataset.name
          ?.toLowerCase()
          .includes(
            searchDataset.toLowerCase()
          ) ||
        dataset.id
          .toLowerCase()
          .includes(
            searchDataset.toLowerCase()
          )
    );

  const filteredUsers =
    users.filter(
      (user) =>
        user.name
          ?.toLowerCase()
          .includes(
            searchUser.toLowerCase()
          ) ||
        user.email
          ?.toLowerCase()
          .includes(
            searchUser.toLowerCase()
          )
    );

  const filteredFields =
    fields.filter(
      (f) =>
        f.name
          ?.toLowerCase()
          .includes(
            searchField.toLowerCase()
          ) ||
        f.location
          ?.toLowerCase()
          .includes(
            searchField.toLowerCase()
          )
    );

  /* =========================================================
     Field Count
  ========================================================= */

  const fieldsCountFor = (
    userId: string
  ) =>
    fields.filter(
      (f) =>
        f.assignedTo === userId
    ).length;

  /* =========================================================
     Status Colors
  ========================================================= */

  const getStatusColor = (
    status: string
  ) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';

      case 'processing':
        return 'bg-yellow-500';

      case 'archived':
        return 'bg-gray-500';

      case 'inactive':
        return 'bg-red-500';

      default:
        return 'bg-gray-500';
    }
  };

  /* =========================================================
     Role Colors
  ========================================================= */

  const getRoleColor = (
    role: string
  ) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-500';

      case 'manager':
        return 'bg-blue-500';

      case 'user':
        return 'bg-green-500';

      default:
        return 'bg-gray-500';
    }
  };

  /* =========================================================
     Add Dataset
  ========================================================= */

  const handleAddDataset = async (
    type: 'image' | 'csv'
  ) => {
    if (!datasetName.trim()) return;

    const datasetsRef =
      ref(db, 'datasets');

    const newRef =
      push(datasetsRef);

    await set(newRef, {
      name: datasetName,
      type,
      size: '0 MB',
      records: 0,
      uploadedBy: 'Admin User',
      status: 'active',
    });

    setDatasetName('');

    setIsUploadImageOpen(false);
    setIsUploadCsvOpen(false);

    resetImageAnalysis();
  };

  /* =========================================================
     Delete Dataset
  ========================================================= */

  const handleDeleteDataset = async (
    id: string
  ) => {
    await remove(
      ref(db, `datasets/${id}`)
    );
  };

  /* =========================================================
     Add User
  ========================================================= */

  const handleAddUser = async () => {
    setUserError('');

    if (
      !newUserName ||
      !newUserEmail ||
      !newUserPassword
    ) {
      setUserError(
        'Please fill all fields.'
      );
      return;
    }

    if (
      newUserPassword.length < 6
    ) {
      setUserError(
        'Password must be at least 6 characters.'
      );
      return;
    }

    setCreatingUser(true);

    try {
      const cred =
        await createUserWithEmailAndPassword(
          secondaryAuth,
          newUserEmail,
          newUserPassword
        );

      await updateProfile(
        cred.user,
        {
          displayName:
            newUserName,
        }
      );

      await set(
        ref(
          db,
          `users/${cred.user.uid}`
        ),
        {
          name: newUserName,
          email: newUserEmail,
          role: newUserRole,
          status: 'active',
          lastLogin: 'Never',
          fields: 0,
        }
      );

      await signOut(
        secondaryAuth
      );

      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole('user');
      setIsAddUserOpen(false);
    } catch (err: any) {
      console.error(err);

      if (
        err.code ===
        'auth/email-already-in-use'
      ) {
        setUserError(
          'An account with this email already exists.'
        );
      } else if (
        err.code ===
        'auth/invalid-email'
      ) {
        setUserError(
          'Please enter a valid email address.'
        );
      } else {
        setUserError(
          'Failed to create user. Please try again.'
        );
      }
    } finally {
      setCreatingUser(false);
    }
  };

  /* =========================================================
     Delete User
  ========================================================= */

  const handleDeleteUser = async (
    id: string
  ) => {
    await remove(
      ref(db, `users/${id}`)
    );
  };

  /* =========================================================
     Add Field
  ========================================================= */

  const handleAddField = async () => {
    if (!newFieldName.trim())
      return;

    const fieldsRef =
      ref(db, 'fields');

    const newRef =
      push(fieldsRef);

    await set(newRef, {
      name: newFieldName,
      location:
        newFieldLocation ||
        'Unspecified',
      assignedTo: '',
      assignedToName:
        'Unassigned',
    });

    setNewFieldName('');
    setNewFieldLocation('');
    setIsAddFieldOpen(false);
  };

  /* =========================================================
     Assign Field
  ========================================================= */

  const handleAssignField = async (
    fieldId: string,
    userId: string
  ) => {
    if (!userId) {
      await update(
        ref(
          db,
          `fields/${fieldId}`
        ),
        {
          assignedTo: '',
          assignedToName:
            'Unassigned',
        }
      );

      return;
    }

    const user = users.find(
      (u) => u.id === userId
    );

    const field = fields.find(
      (f) => f.id === fieldId
    );

    await update(
      ref(
        db,
        `fields/${fieldId}`
      ),
      {
        assignedTo: userId,
        assignedToName:
          user?.name || 'Unknown',
      }
    );

    /* =========================================================
       EmailJS Notification
    ========================================================= */

    if (user?.email) {
      try {
        await emailjs.send(
          'service_ri9ylsi',
          'template_8v74lz2',
          {
            to_email:
              user.email,

            to_name:
              user.name,

            field_name:
              field?.name ||
              'a field',

            field_location:
              field?.location ||
              'Unspecified',
          },
          'ZG3Da8kuimxB55dEZ'
        );

        setEmailStatus(
          `Notification email sent to ${user.name}`
        );

        setTimeout(
          () =>
            setEmailStatus(''),
          4000
        );
      } catch (err) {
        console.error(
          'Failed to send assignment email:',
          err
        );

        setEmailStatus(
          'Field assigned, but the email notification failed to send.'
        );

        setTimeout(
          () =>
            setEmailStatus(''),
          4000
        );
      }
    }
  };

  /* =========================================================
     Delete Field
  ========================================================= */

  const handleDeleteField = async (
    id: string
  ) => {
    await remove(
      ref(db, `fields/${id}`)
    );
  };

  /* =========================================================
     PDF Report
  ========================================================= */

  const handleDownloadReport = () => {
    const doc = new jsPDF();

    const dateStr =
      new Date().toLocaleString();

    doc.setFontSize(18);

    doc.text(
      'AgroEye Admin Report',
      14,
      18
    );

    doc.setFontSize(10);
    doc.setTextColor(100);

    doc.text(
      `Generated: ${dateStr}`,
      14,
      25
    );

    doc.setFontSize(13);
    doc.setTextColor(0);

    doc.text(
      'Datasets',
      14,
      36
    );

    autoTable(doc, {
      startY: 40,

      head: [
        [
          'ID',
          'Name',
          'Type',
          'Status',
          'Records',
          'Uploaded By',
        ],
      ],

      body: datasets.map(
        (d) => [
          d.id,
          d.name,
          d.type,
          d.status,
          String(
            d.records || 0
          ),
          d.uploadedBy,
        ]
      ),

      theme: 'striped',

      headStyles: {
        fillColor: [
          34,
          139,
          34,
        ],
      },
    });

    let nextY =
      (doc as any).lastAutoTable
        .finalY + 12;

    doc.setFontSize(13);

    doc.text(
      'Users',
      14,
      nextY
    );

    autoTable(doc, {
      startY: nextY + 4,

      head: [
        [
          'Name',
          'Email',
          'Role',
          'Status',
          'Last Login',
          'Fields Managed',
        ],
      ],

      body: users.map(
        (u) => [
          u.name,
          u.email,
          u.role,
          u.status,
          u.lastLogin,
          String(
            fieldsCountFor(
              u.id
            )
          ),
        ]
      ),

      theme: 'striped',

      headStyles: {
        fillColor: [
          37,
          99,
          235,
        ],
      },
    });

    nextY =
      (doc as any).lastAutoTable
        .finalY + 12;

    doc.setFontSize(13);

    doc.text(
      'Fields',
      14,
      nextY
    );

    autoTable(doc, {
      startY: nextY + 4,

      head: [
        [
          'Name',
          'Location',
          'Assigned To',
        ],
      ],

      body: fields.map(
        (f) => [
          f.name,
          f.location,
          f.assignedTo
            ? f.assignedToName
            : 'Unassigned',
        ]
      ),

      theme: 'striped',

      headStyles: {
        fillColor: [
          147,
          51,
          234,
        ],
      },
    });

    doc.save(
      `AgroEye_Report_${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`
    );
  };

  /* =========================================================
     UI
  ========================================================= */

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-gray-50">

      {/* Header */}

      <header className="bg-white border-b border-green-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-4 lg:px-6 py-4">

          <div className="flex items-center justify-between">

            <div className="flex items-center gap-4">

              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                <Sprout className="w-6 h-6 text-white" />
              </div>

              <div>
                <h1 className="text-green-800">
                  AgroEye Admin Panel
                </h1>

                <p className="text-green-600 text-sm">
                  Paddy Monitoring System Management
                </p>
              </div>

            </div>

            <div className="flex items-center gap-3">

              <Button
                onClick={
                  handleDownloadReport
                }
                style={{
                  backgroundColor:
                    '#16a34a',
                  color:
                    '#ffffff',
                }}
              >
                <Database className="w-4 h-4 mr-2" />

                <span className="hidden sm:inline">
                  Download Report (PDF)
                </span>
              </Button>

              <Button
                variant="outline"
                className="border-green-200 text-green-700 hover:bg-green-50"
              >
                <Settings className="w-4 h-4 mr-2" />

                <span className="hidden sm:inline">
                  Settings
                </span>
              </Button>

              <Button
                variant="outline"
                className="border-green-200 text-green-700 hover:bg-green-50"
              >
                <LogOut className="w-4 h-4 mr-2" />

                <span className="hidden sm:inline">
                  Logout
                </span>
              </Button>

            </div>
          </div>
        </div>
      </header>

      {/* Email Status */}

      {emailStatus && (
        <div className="max-w-[1600px] mx-auto px-4 lg:px-6 pt-4">
          <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm rounded-lg px-4 py-2">
            {emailStatus}
          </div>
        </div>
      )}

      {/* Main Content */}

      <div className="max-w-[1600px] mx-auto px-4 lg:px-6 py-6 space-y-6">

        {/* Stats */}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          <Card>
            <CardContent className="p-6">

              <div className="flex items-center justify-between">

                <div>
                  <p className="text-green-600 text-sm mb-1">
                    Total Datasets
                  </p>

                  <p className="text-green-800">
                    {datasets.length}
                  </p>
                </div>

                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Database className="w-6 h-6 text-green-600" />
                </div>

              </div>

            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">

              <div className="flex items-center justify-between">

                <div>
                  <p className="text-blue-600 text-sm mb-1">
                    Total Users
                  </p>

                  <p className="text-blue-800">
                    {users.length}
                  </p>
                </div>

                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>

              </div>

            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">

              <div className="flex items-center justify-between">

                <div>
                  <p className="text-purple-600 text-sm mb-1">
                    Total Fields
                  </p>

                  <p className="text-purple-800">
                    {fields.length}
                  </p>
                </div>

                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-purple-600" />
                </div>

              </div>

            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">

              <div className="flex items-center justify-between">

                <div>
                  <p className="text-orange-600 text-sm mb-1">
                    Datasets Active
                  </p>

                  <p className="text-orange-800">
                    {
                      datasets.filter(
                        (d) =>
                          d.status ===
                          'active'
                      ).length
                    }
                  </p>
                </div>

                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Database className="w-6 h-6 text-orange-600" />
                </div>

              </div>

            </CardContent>
          </Card>

        </div>

        {/* Three Column Layout */}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* =================================================
              Dataset Management
          ================================================= */}

          <Card className="shadow-lg">

            <CardHeader className="border-b border-green-100 bg-gradient-to-r from-green-50 to-white">

              <div className="flex items-center justify-between flex-wrap gap-2">

                <CardTitle className="flex items-center gap-2 text-green-800">
                  <Database className="w-5 h-5" />
                  Dataset Management
                </CardTitle>

                <div className="flex items-center gap-2">

                  {/* Image Dataset */}

                  <Dialog
                    open={
                      isUploadImageOpen
                    }
                    onOpenChange={
                      setIsUploadImageOpen
                    }
                  >

                    <DialogTrigger
                      asChild
                    >
                      <Button
                        className="bg-green-600 hover:bg-green-700"
                        size="sm"
                      >
                        <FileImage className="w-4 h-4 mr-2" />
                        Add Image Set
                      </Button>
                    </DialogTrigger>

                    <DialogContent className="max-h-[90vh] overflow-y-auto">

                      <DialogHeader>

                        <DialogTitle>
                          Add Image Dataset
                        </DialogTitle>

                        <DialogDescription>
                          Create a dataset entry for paddy field images
                        </DialogDescription>

                      </DialogHeader>

                      <div className="space-y-4 py-4">

                        <div>

                          <Label htmlFor="dataset-name">
                            Dataset Name
                          </Label>

                          <Input
                            id="dataset-name"
                            placeholder="e.g., Paddy Field Images - South Region"
                            className="mt-2"
                            value={
                              datasetName
                            }
                            onChange={(e) =>
                              setDatasetName(
                                e.target.value
                              )
                            }
                          />

                        </div>

                        {/* Mobile Camera/Gallery */}

                        <div className="md:hidden">

                          {!capturedImage ? (

                            <div className="grid grid-cols-2 gap-3">

                              {/* Camera */}

                              <label className="border-2 border-dashed border-green-300 rounded-lg p-5 text-center flex flex-col items-center justify-center cursor-pointer hover:border-green-400 transition-colors">

                                <Camera className="w-7 h-7 text-green-600 mb-2" />

                                <p className="text-green-700 text-sm mb-1">
                                  Take a Photo
                                </p>

                                <p className="text-green-600 text-xs">
                                  Use camera
                                </p>

                                <input
                                  type="file"
                                  accept="image/*"
                                  capture="environment"
                                  onChange={(e) =>
                                    handleImageSelect(
                                      e,
                                      'camera'
                                    )
                                  }
                                  className="hidden"
                                />

                              </label>

                              {/* Gallery */}

                              <label className="border-2 border-dashed border-green-300 rounded-lg p-5 text-center flex flex-col items-center justify-center cursor-pointer hover:border-green-400 transition-colors">

                                <Images className="w-7 h-7 text-green-600 mb-2" />

                                <p className="text-green-700 text-sm mb-1">
                                  Choose from Gallery
                                </p>

                                <p className="text-green-600 text-xs">
                                  Pick an existing photo
                                </p>

                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) =>
                                    handleImageSelect(
                                      e,
                                      'gallery'
                                    )
                                  }
                                  className="hidden"
                                />

                              </label>

                            </div>

                          ) : (

                            <div className="space-y-3">

                              <img
                                src={
                                  capturedImage
                                }
                                alt="Selected paddy"
                                className="w-full rounded-lg border border-green-200 max-h-64 object-cover"
                              />

                              {imageSource && (
                                <p className="text-green-500 text-xs text-center">
                                  Source:{' '}
                                  {imageSource ===
                                  'camera'
                                    ? 'Camera'
                                    : 'Gallery'}
                                </p>
                              )}

                              <div className="flex gap-2">

                                <Button
                                  variant="outline"
                                  className="flex-1"
                                  onClick={
                                    resetImageAnalysis
                                  }
                                  disabled={
                                    analyzing
                                  }
                                >
                                  {imageSource ===
                                  'gallery'
                                    ? 'Choose Another'
                                    : 'Retake'}
                                </Button>

                                <Button
                                  className="flex-1"
                                  style={{
                                    backgroundColor:
                                      '#16a34a',
                                    color:
                                      '#ffffff',
                                  }}
                                  onClick={
                                    handleAnalyzeImage
                                  }
                                  disabled={
                                    analyzing
                                  }
                                >
                                  {analyzing ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      Analyzing...
                                    </>
                                  ) : (
                                    'Analyze Paddy Health'
                                  )}
                                </Button>

                              </div>

                              {/* Error */}

                              {analysisError && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                                  {
                                    analysisError
                                  }
                                </div>
                              )}

                              {/* Analysis */}

                              {analysisResult &&
                                (() => {

                                  const displayedText =
                                    reportLang !==
                                      'en' &&
                                    translatedReports[
                                      reportLang
                                    ]
                                      ? translatedReports[
                                          reportLang
                                        ]!
                                      : analysisResult;

                                  const sections =
                                    parseAnalysisText(
                                      displayedText
                                    );

                                  const rawSection =
                                    sections.find(
                                      (s) =>
                                        s.key ===
                                        'RAW'
                                    );

                                  const healthSection =
                                    sections.find(
                                      (s) =>
                                        s.key ===
                                        'HEALTH STATUS'
                                    );

                                  const diseaseSection =
                                    sections.find(
                                      (s) =>
                                        s.key ===
                                        'DISEASE NAME'
                                    );

                                  const symptomsSection =
                                    sections.find(
                                      (s) =>
                                        s.key ===
                                        'SYMPTOMS OBSERVED'
                                    );

                                  const confidenceSection =
                                    sections.find(
                                      (s) =>
                                        s.key ===
                                        'CONFIDENCE LEVEL'
                                    );

                                  const actionSection =
                                    sections.find(
                                      (s) =>
                                        s.key ===
                                        'RECOMMENDED ACTION'
                                    );

                                  /* English version is used for
                                     badge classification */

                                  const englishSections =
                                    parseAnalysisText(
                                      analysisResult
                                    );

                                  const englishHealth =
                                    (
                                      englishSections.find(
                                        (s) =>
                                          s.key ===
                                          'HEALTH STATUS'
                                      )?.content ||
                                      ''
                                    ).toLowerCase();

                                  const englishConfidence =
                                    (
                                      englishSections.find(
                                        (s) =>
                                          s.key ===
                                          'CONFIDENCE LEVEL'
                                      )?.content ||
                                      ''
                                    ).toLowerCase();

                                  const isDiseased =
                                    englishHealth.includes(
                                      'diseased'
                                    );

                                  const isHealthy =
                                    !isDiseased &&
                                    englishHealth.includes(
                                      'healthy'
                                    );

                                  const healthColor =
                                    isDiseased
                                      ? 'bg-red-500'
                                      : isHealthy
                                      ? 'bg-green-500'
                                      : 'bg-yellow-500';

                                  const HealthIcon =
                                    isDiseased
                                      ? XCircle
                                      : isHealthy
                                      ? CheckCircle2
                                      : HelpCircle;

                                  const healthLabel =
                                    healthSection?.content
                                      ? healthSection.content
                                          .split(
                                            /[.\n]/
                                          )[0]
                                          .trim()
                                      : isDiseased
                                      ? 'Diseased'
                                      : isHealthy
                                      ? 'Healthy'
                                      : 'Unclear';

                                  const confidenceLabel =
                                    englishConfidence.includes(
                                      'high'
                                    )
                                      ? 'High'
                                      : englishConfidence.includes(
                                          'medium'
                                        )
                                      ? 'Medium'
                                      : englishConfidence.includes(
                                          'low'
                                        )
                                      ? 'Low'
                                      : null;

                                  const confidenceColor =
                                    confidenceLabel ===
                                    'High'
                                      ? 'bg-green-500'
                                      : confidenceLabel ===
                                        'Medium'
                                      ? 'bg-yellow-500'
                                      : confidenceLabel ===
                                        'Low'
                                      ? 'bg-red-500'
                                      : 'bg-gray-500';

                                  return (
                                    <div className="space-y-2">

                                      {/* Language Switcher */}

                                      <div className="flex items-center gap-1.5 flex-wrap">

                                        {(
                                          [
                                            'en',
                                            'si',
                                            'ta',
                                          ] as const
                                        ).map(
                                          (
                                            lang
                                          ) => (
                                            <button
                                              key={
                                                lang
                                              }
                                              type="button"
                                              onClick={() =>
                                                handleReportLangChange(
                                                  lang
                                                )
                                              }
                                              disabled={
                                                translating
                                              }
                                              className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                                                reportLang ===
                                                lang
                                                  ? 'bg-green-600 text-white border-green-600'
                                                  : 'bg-white text-green-700 border-green-200 hover:bg-green-50'
                                              } disabled:opacity-50`}
                                            >
                                              {lang ===
                                              'en'
                                                ? 'English'
                                                : lang ===
                                                  'si'
                                                ? 'සිංහල'
                                                : 'தமிழ்'}
                                            </button>
                                          )
                                        )}

                                        {translating && (
                                          <span className="flex items-center gap-1 text-xs text-green-600">
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            Translating...
                                          </span>
                                        )}

                                      </div>

                                      <div className="border border-green-200 rounded-lg bg-green-50 p-3 space-y-3">

                                        {rawSection ? (

                                          <p className="text-green-800 text-sm whitespace-pre-wrap">
                                            {
                                              rawSection.content
                                            }
                                          </p>

                                        ) : (

                                          <>

                                            {/* Health Status */}

                                            <div className="flex items-center justify-between bg-white rounded-lg p-3 border border-green-100">

                                              <div className="flex items-center gap-2">

                                                <div
                                                  className={`w-8 h-8 rounded-full flex items-center justify-center ${healthColor}`}
                                                >
                                                  <HealthIcon className="w-4 h-4 text-white" />
                                                </div>

                                                <div>

                                                  <p className="text-green-600 text-xs">
                                                    Health Status
                                                  </p>

                                                  <p className="text-green-800">
                                                    {
                                                      healthLabel
                                                    }
                                                  </p>

                                                </div>

                                              </div>

                                              {confidenceLabel && (
                                                <Badge
                                                  className={`${confidenceColor}`}
                                                >
                                                  {
                                                    confidenceLabel
                                                  }{' '}
                                                  confidence
                                                </Badge>
                                              )}

                                            </div>

                                            {/* Disease */}

                                            {diseaseSection?.content &&
                                              !/^none\.?$/i.test(
                                                diseaseSection.content.trim()
                                              ) && (
                                                <div className="bg-white rounded-lg p-3 border border-green-100">

                                                  <p className="text-green-600 text-xs mb-1 flex items-center gap-1">
                                                    <Bug className="w-3.5 h-3.5" />
                                                    Disease Identified
                                                  </p>

                                                  <p className="text-green-800 text-sm">
                                                    {
                                                      diseaseSection.content
                                                    }
                                                  </p>

                                                </div>
                                              )}

                                            {/* Symptoms */}

                                            {symptomsSection?.content && (
                                              <div className="bg-white rounded-lg p-3 border border-green-100">

                                                <p className="text-green-600 text-xs mb-2 flex items-center gap-1">
                                                  <Microscope className="w-3.5 h-3.5" />
                                                  Symptoms Observed
                                                </p>

                                                <ul className="space-y-1.5">

                                                  {splitIntoBullets(
                                                    symptomsSection.content
                                                  ).map(
                                                    (
                                                      item,
                                                      i
                                                    ) => (
                                                      <li
                                                        key={
                                                          i
                                                        }
                                                        className="flex items-start gap-2 text-sm text-green-800"
                                                      >
                                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />

                                                        <span>
                                                          {
                                                            item
                                                          }
                                                        </span>
                                                      </li>
                                                    )
                                                  )}

                                                </ul>

                                              </div>
                                            )}

                                            {/* Confidence */}

                                            {confidenceSection?.content && (
                                              <div className="bg-white rounded-lg p-3 border border-green-100">

                                                <p className="text-green-600 text-xs mb-1 flex items-center gap-1">
                                                  <Gauge className="w-3.5 h-3.5" />
                                                  Confidence Reasoning
                                                </p>

                                                <p className="text-green-700 text-sm">
                                                  {
                                                    confidenceSection.content
                                                  }
                                                </p>

                                              </div>
                                            )}

                                            {/* Recommended Action */}

                                            {actionSection?.content && (
                                              <div className="bg-white rounded-lg p-3 border border-green-100">

                                                <p className="text-green-600 text-xs mb-2 flex items-center gap-1">
                                                  <ClipboardList className="w-3.5 h-3.5" />
                                                  Recommended Action
                                                </p>

                                                <ol className="space-y-1.5">

                                                  {splitIntoBullets(
                                                    actionSection.content
                                                  ).map(
                                                    (
                                                      item,
                                                      i
                                                    ) => (
                                                      <li
                                                        key={
                                                          i
                                                        }
                                                        className="flex items-start gap-2 text-sm text-green-800"
                                                      >

                                                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-600 text-white text-xs flex items-center justify-center mt-0.5">
                                                          {
                                                            i +
                                                            1
                                                          }
                                                        </span>

                                                        <span>
                                                          {
                                                            item
                                                          }
                                                        </span>

                                                      </li>
                                                    )
                                                  )}

                                                </ol>

                                              </div>
                                            )}

                                          </>
                                        )}

                                      </div>
                                    </div>
                                  );
                                })()}

                            </div>
                          )}

                        </div>

                        {/* Desktop Notice */}

                        <div className="hidden md:block border-2 border-dashed border-green-200 rounded-lg p-8 text-center">

                          <Camera className="w-8 h-8 text-green-600 mx-auto mb-2" />

                          <p className="text-green-700 mb-1">
                            Paddy health analysis is available on mobile only
                          </p>

                          <p className="text-green-600 text-sm">
                            Open this page on your phone to take or choose a photo and analyze it
                          </p>

                        </div>

                      </div>

                      <div className="flex justify-end gap-3">

                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsUploadImageOpen(
                              false
                            );
                            resetImageAnalysis();
                          }}
                        >
                          Cancel
                        </Button>

                        <Button
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() =>
                            handleAddDataset(
                              'image'
                            )
                          }
                        >
                          Save Dataset
                        </Button>

                      </div>

                    </DialogContent>

                  </Dialog>

                  {/* CSV Dataset */}

                  <Dialog
                    open={
                      isUploadCsvOpen
                    }
                    onOpenChange={
                      setIsUploadCsvOpen
                    }
                  >

                    <DialogTrigger
                      asChild
                    >
                      <Button
                        variant="outline"
                        className="border-green-200 text-green-700 hover:bg-green-50"
                        size="sm"
                      >
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Add CSV Set
                      </Button>
                    </DialogTrigger>

                    <DialogContent>

                      <DialogHeader>

                        <DialogTitle>
                          Add CSV Dataset
                        </DialogTitle>

                        <DialogDescription>
                          Create a dataset entry for sensor or weather data
                        </DialogDescription>

                      </DialogHeader>

                      <div className="space-y-4 py-4">

                        <div>

                          <Label htmlFor="csv-name">
                            Dataset Name
                          </Label>

                          <Input
                            id="csv-name"
                            placeholder="e.g., Sensor Data - December 2025"
                            className="mt-2"
                            value={
                              datasetName
                            }
                            onChange={(e) =>
                              setDatasetName(
                                e.target.value
                              )
                            }
                          />

                        </div>

                        <div className="border-2 border-dashed border-green-200 rounded-lg p-8 text-center">

                          <FileSpreadsheet className="w-8 h-8 text-green-600 mx-auto mb-2" />

                          <p className="text-green-700 mb-1">
                            File upload coming soon
                          </p>

                          <p className="text-green-600 text-sm">
                            This creates a dataset record for now
                          </p>

                        </div>

                      </div>

                      <div className="flex justify-end gap-3">

                        <Button
                          variant="outline"
                          onClick={() =>
                            setIsUploadCsvOpen(
                              false
                            )
                          }
                        >
                          Cancel
                        </Button>

                        <Button
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() =>
                            handleAddDataset(
                              'csv'
                            )
                          }
                        >
                          Save Dataset
                        </Button>

                      </div>

                    </DialogContent>

                  </Dialog>

                </div>

              </div>

            </CardHeader>

            <CardContent className="p-4">

              <div className="mb-4">

                <div className="relative">

                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600" />

                  <Input
                    placeholder="Search datasets..."
                    value={
                      searchDataset
                    }
                    onChange={(e) =>
                      setSearchDataset(
                        e.target.value
                      )
                    }
                    className="pl-10 border-green-200 focus:border-green-500"
                  />

                </div>

              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">

                {filteredDatasets.length ===
                  0 && (
                  <p className="text-green-500 text-sm text-center py-6">
                    No datasets yet.
                  </p>
                )}

                {filteredDatasets.map(
                  (dataset) => (
                    <Card
                      key={
                        dataset.id
                      }
                      className="border border-green-100 hover:shadow-md transition-shadow"
                    >

                      <CardContent className="p-4">

                        <div className="flex items-start justify-between mb-3">

                          <div className="flex items-start gap-3 flex-1">

                            <div
                              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                dataset.type ===
                                'image'
                                  ? 'bg-purple-100'
                                  : 'bg-blue-100'
                              }`}
                            >

                              {dataset.type ===
                              'image' ? (
                                <FileImage className="w-5 h-5 text-purple-600" />
                              ) : (
                                <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                              )}

                            </div>

                            <div className="flex-1 min-w-0">

                              <p className="text-green-800 mb-1">
                                {
                                  dataset.name
                                }
                              </p>

                              <p className="text-green-600 text-sm mb-2">
                                {
                                  dataset.id
                                }
                              </p>

                              <div className="flex items-center gap-2 flex-wrap">

                                <Badge
                                  className={`${getStatusColor(
                                    dataset.status
                                  )}`}
                                >
                                  {
                                    dataset.status
                                  }
                                </Badge>

                                <Badge
                                  variant="outline"
                                  className="border-green-200 text-green-700"
                                >
                                  {dataset.records?.toLocaleString() ||
                                    0}{' '}
                                  records
                                </Badge>

                              </div>

                            </div>

                          </div>

                          <DropdownMenu>

                            <DropdownMenuTrigger
                              asChild
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="end">

                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() =>
                                  handleDeleteDataset(
                                    dataset.id
                                  )
                                }
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>

                            </DropdownMenuContent>

                          </DropdownMenu>

                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">

                          <div>

                            <p className="text-green-600 text-xs mb-1">
                              Size
                            </p>

                            <p className="text-green-800">
                              {
                                dataset.size
                              }
                            </p>

                          </div>

                          <div>

                            <p className="text-green-600 text-xs mb-1">
                              Uploaded By
                            </p>

                            <p className="text-green-800">
                              {
                                dataset.uploadedBy
                              }
                            </p>

                          </div>

                        </div>

                      </CardContent>

                    </Card>
                  )
                )}

              </div>

            </CardContent>

          </Card>

          {/* =================================================
              User Management
          ================================================= */}

          <Card className="shadow-lg">

            <CardHeader className="border-b border-blue-100 bg-gradient-to-r from-blue-50 to-white">

              <div className="flex items-center justify-between">

                <CardTitle className="flex items-center gap-2 text-blue-800">

                  <Users className="w-5 h-5" />

                  User Management

                </CardTitle>

                <Dialog
                  open={
                    isAddUserOpen
                  }
                  onOpenChange={
                    setIsAddUserOpen
                  }
                >

                  <DialogTrigger
                    asChild
                  >
                    <Button
                      className="bg-blue-600 hover:bg-blue-700"
                      size="sm"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add User
                    </Button>
                  </DialogTrigger>

                  <DialogContent>

                    <DialogHeader>

                      <DialogTitle>
                        Add New User
                      </DialogTitle>

                      <DialogDescription>
                        Create a new user account and assign appropriate roles
                      </DialogDescription>

                    </DialogHeader>

                    {userError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                        {
                          userError
                        }
                      </div>
                    )}

                    <div className="space-y-4 py-4">

                      <div>

                        <Label htmlFor="user-name">
                          Full Name
                        </Label>

                        <Input
                          id="user-name"
                          placeholder="Enter full name"
                          className="mt-2"
                          value={
                            newUserName
                          }
                          onChange={(e) =>
                            setNewUserName(
                              e.target.value
                            )
                          }
                        />

                      </div>

                      <div>

                        <Label htmlFor="user-email">
                          Email Address
                        </Label>

                        <Input
                          id="user-email"
                          type="email"
                          placeholder="user@example.com"
                          className="mt-2"
                          value={
                            newUserEmail
                          }
                          onChange={(e) =>
                            setNewUserEmail(
                              e.target.value
                            )
                          }
                        />

                      </div>

                      <div>

                        <Label htmlFor="user-role">
                          User Role
                        </Label>

                        <Select
                          value={
                            newUserRole
                          }
                          onValueChange={(
                            v
                          ) =>
                            setNewUserRole(
                              v as
                                | 'admin'
                                | 'manager'
                                | 'user'
                            )
                          }
                        >

                          <SelectTrigger className="mt-2">
                            <SelectValue />
                          </SelectTrigger>

                          <SelectContent>

                            <SelectItem value="admin">
                              Admin - Full Access
                            </SelectItem>

                            <SelectItem value="manager">
                              Manager - Manage Fields
                            </SelectItem>

                            <SelectItem value="user">
                              User - View Only
                            </SelectItem>

                          </SelectContent>

                        </Select>

                      </div>

                      <div>

                        <Label htmlFor="user-password">
                          Initial Password
                        </Label>

                        <Input
                          id="user-password"
                          type="password"
                          placeholder="Set temporary password (min 6 chars)"
                          className="mt-2"
                          value={
                            newUserPassword
                          }
                          onChange={(e) =>
                            setNewUserPassword(
                              e.target.value
                            )
                          }
                        />

                      </div>

                    </div>

                    <div className="flex justify-end gap-3">

                      <Button
                        variant="outline"
                        onClick={() =>
                          setIsAddUserOpen(
                            false
                          )
                        }
                      >
                        Cancel
                      </Button>

                      <Button
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={
                          handleAddUser
                        }
                        disabled={
                          creatingUser
                        }
                      >
                        {creatingUser
                          ? 'Creating...'
                          : 'Create User'}
                      </Button>

                    </div>

                  </DialogContent>

                </Dialog>

              </div>

            </CardHeader>

            <CardContent className="p-4">

              <div className="mb-4">

                <div className="relative">

                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-600" />

                  <Input
                    placeholder="Search users..."
                    value={
                      searchUser
                    }
                    onChange={(e) =>
                      setSearchUser(
                        e.target.value
                      )
                    }
                    className="pl-10 border-blue-200 focus:border-blue-500"
                  />

                </div>

              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">

                {filteredUsers.length ===
                  0 && (
                  <p className="text-blue-500 text-sm text-center py-6">
                    No users yet.
                  </p>
                )}

                {filteredUsers.map(
                  (user) => (
                    <Card
                      key={
                        user.id
                      }
                      className="border border-blue-100 hover:shadow-md transition-shadow"
                    >

                      <CardContent className="p-4">

                        <div className="flex items-start justify-between mb-3">

                          <div className="flex items-start gap-3 flex-1">

                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white">

                              {
                                user.name?.charAt(
                                  0
                                ) || '?'
                              }

                            </div>

                            <div className="flex-1 min-w-0">

                              <p className="text-blue-800 mb-1">
                                {
                                  user.name
                                }
                              </p>

                              <p className="text-blue-600 text-sm mb-2">
                                {
                                  user.email
                                }
                              </p>

                              <div className="flex items-center gap-2 flex-wrap">

                                <Badge
                                  className={`${getRoleColor(
                                    user.role
                                  )}`}
                                >
                                  {
                                    user.role
                                  }
                                </Badge>

                                <Badge
                                  className={`${getStatusColor(
                                    user.status
                                  )}`}
                                >
                                  {
                                    user.status
                                  }
                                </Badge>

                              </div>

                            </div>

                          </div>

                          <DropdownMenu>

                            <DropdownMenuTrigger
                              asChild
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="end">

                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() =>
                                  handleDeleteUser(
                                    user.id
                                  )
                                }
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Remove Profile
                              </DropdownMenuItem>

                            </DropdownMenuContent>

                          </DropdownMenu>

                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">

                          <div>

                            <p className="text-blue-600 text-xs mb-1">
                              Last Login
                            </p>

                            <p className="text-blue-800">
                              {
                                user.lastLogin
                              }
                            </p>

                          </div>

                          <div>

                            <p className="text-blue-600 text-xs mb-1">
                              Fields Managed
                            </p>

                            <p className="text-blue-800">
                              {
                                fieldsCountFor(
                                  user.id
                                )
                              }{' '}
                              fields
                            </p>

                          </div>

                        </div>

                      </CardContent>

                    </Card>
                  )
                )}

              </div>

            </CardContent>

          </Card>

          {/* =================================================
              Field Management
          ================================================= */}

          <Card className="shadow-lg">

            <CardHeader className="border-b border-purple-100 bg-gradient-to-r from-purple-50 to-white">

              <div className="flex items-center justify-between">

                <CardTitle className="flex items-center gap-2 text-purple-800">

                  <MapPin className="w-5 h-5" />

                  Field Management

                </CardTitle>

                <Dialog
                  open={
                    isAddFieldOpen
                  }
                  onOpenChange={
                    setIsAddFieldOpen
                  }
                >

                  <DialogTrigger
                    asChild
                  >
                    <Button
                      style={{
                        backgroundColor:
                          '#9333ea',
                        color:
                          '#ffffff',
                      }}
                      size="sm"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Field
                    </Button>
                  </DialogTrigger>

                  <DialogContent>

                    <DialogHeader>

                      <DialogTitle>
                        Add New Field
                      </DialogTitle>

                      <DialogDescription>
                        Register a paddy field to monitor
                      </DialogDescription>

                    </DialogHeader>

                    <div className="space-y-4 py-4">

                      <div>

                        <Label htmlFor="field-name">
                          Field Name
                        </Label>

                        <Input
                          id="field-name"
                          placeholder="e.g., Field A3 - North Region"
                          className="mt-2"
                          value={
                            newFieldName
                          }
                          onChange={(e) =>
                            setNewFieldName(
                              e.target.value
                            )
                          }
                        />

                      </div>

                      <div>

                        <Label htmlFor="field-location">
                          Location
                        </Label>

                        <Input
                          id="field-location"
                          placeholder="e.g., Anuradhapura"
                          className="mt-2"
                          value={
                            newFieldLocation
                          }
                          onChange={(e) =>
                            setNewFieldLocation(
                              e.target.value
                            )
                          }
                        />

                      </div>

                    </div>

                    <div className="flex justify-end gap-3">

                      <Button
                        variant="outline"
                        onClick={() =>
                          setIsAddFieldOpen(
                            false
                          )
                        }
                      >
                        Cancel
                      </Button>

                      <Button
                        style={{
                          backgroundColor:
                            '#9333ea',
                          color:
                            '#ffffff',
                        }}
                        onClick={
                          handleAddField
                        }
                      >
                        Save Field
                      </Button>

                    </div>

                  </DialogContent>

                </Dialog>

              </div>

            </CardHeader>

            <CardContent className="p-4">

              <div className="mb-4">

                <div className="relative">

                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-600" />

                  <Input
                    placeholder="Search fields..."
                    value={
                      searchField
                    }
                    onChange={(e) =>
                      setSearchField(
                        e.target.value
                      )
                    }
                    className="pl-10 border-purple-200 focus:border-purple-500"
                  />

                </div>

              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">

                {filteredFields.length ===
                  0 && (
                  <p className="text-purple-500 text-sm text-center py-6">
                    No fields yet.
                  </p>
                )}

                {filteredFields.map(
                  (field) => (
                    <Card
                      key={
                        field.id
                      }
                      className="border border-purple-100 hover:shadow-md transition-shadow"
                    >

                      <CardContent className="p-4">

                        <div className="flex items-start justify-between mb-3">

                          <div className="flex items-start gap-3 flex-1">

                            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">

                              <MapPin className="w-5 h-5 text-purple-600" />

                            </div>

                            <div className="flex-1 min-w-0">

                              <p className="text-purple-800 mb-1">
                                {
                                  field.name
                                }
                              </p>

                              <p className="text-purple-600 text-sm mb-2">
                                {
                                  field.location
                                }
                              </p>

                              <Badge
                                className={
                                  field.assignedTo
                                    ? 'bg-green-500 hover:bg-green-500'
                                    : 'bg-gray-400 hover:bg-gray-400'
                                }
                              >
                                {field.assignedTo
                                  ? field.assignedToName
                                  : 'Unassigned'}
                              </Badge>

                            </div>

                          </div>

                          <DropdownMenu>

                            <DropdownMenuTrigger
                              asChild
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="end">

                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() =>
                                  handleDeleteField(
                                    field.id
                                  )
                                }
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>

                            </DropdownMenuContent>

                          </DropdownMenu>

                        </div>

                        <div>

                          <Label className="text-xs text-purple-600">
                            Assign to
                          </Label>

                          <Select
                            value={
                              field.assignedTo ||
                              'unassigned'
                            }
                            onValueChange={(
                              v
                            ) =>
                              handleAssignField(
                                field.id,
                                v ===
                                  'unassigned'
                                  ? ''
                                  : v
                              )
                            }
                          >

                            <SelectTrigger className="mt-1 h-9">
                              <SelectValue />
                            </SelectTrigger>

                            <SelectContent>

                              <SelectItem value="unassigned">
                                Unassigned
                              </SelectItem>

                              {users.map(
                                (u) => (
                                  <SelectItem
                                    key={
                                      u.id
                                    }
                                    value={
                                      u.id
                                    }
                                  >
                                    {
                                      u.name
                                    }{' '}
                                    (
                                    {
                                      u.role
                                    }
                                    )
                                  </SelectItem>
                                )
                              )}

                            </SelectContent>

                          </Select>

                        </div>

                      </CardContent>

                    </Card>
                  )
                )}

              </div>

            </CardContent>

          </Card>

        </div>
      </div>
    </div>
  );
}
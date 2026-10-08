
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Database,
  Download,
  FileSpreadsheet,
  Leaf,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
  Sprout,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import {
  onValue,
  push,
  ref,
  remove,
  set,
  update,
} from "firebase/database";
import {
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { db, secondaryAuth } from "../firebase";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Dataset = {
  id: string;
  name: string;
  type: "image" | "csv";
  status: string;
  records?: number;
  uploadedBy?: string;
};

type User = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "user";
  status: string;
};

type Field = {
  id: string;
  name: string;
  location: string;
  assignedTo: string;
  assignedToName: string;
};

type Tab = "datasets" | "users" | "fields";
type Modal = "dataset" | "user" | "field" | null;

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50";

function StatusBadge({ status }: { status: string }) {
  const active = status === "active";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${active
          ? "bg-emerald-50 text-emerald-700"
          : "bg-slate-100 text-slate-600"
        }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${active ? "bg-emerald-500" : "bg-slate-400"
          }`}
      />
      {status}
    </span>
  );
}

export function AdminPanel() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [fields, setFields] = useState<Field[]>([]);

  const [tab, setTab] = useState<Tab>("datasets");
  const [modal, setModal] = useState<Modal>(null);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [datasetName, setDatasetName] = useState("");
  const [datasetType, setDatasetType] =
    useState<"image" | "csv">("image");

  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userRole, setUserRole] =
    useState<"admin" | "manager" | "user">("user");

  const [fieldName, setFieldName] = useState("");
  const [fieldLocation, setFieldLocation] = useState("");

  // Firebase real-time listeners
  useEffect(() => {
    const unsubDatasets = onValue(
      ref(db, "datasets"),
      snapshot => {
        const data = snapshot.val() || {};
        setDatasets(
          Object.entries(data).map(([id, value]) => ({
            ...(value as Omit<Dataset, "id">),
            id,
          }))
        );
      },
      err => setError(err.message)
    );

    const unsubUsers = onValue(
      ref(db, "users"),
      snapshot => {
        const data = snapshot.val() || {};
        setUsers(
          Object.entries(data).map(([id, value]) => ({
            ...(value as Omit<User, "id">),
            id,
          }))
        );
      },
      err => setError(err.message)
    );

    const unsubFields = onValue(
      ref(db, "fields"),
      snapshot => {
        const data = snapshot.val() || {};
        setFields(
          Object.entries(data).map(([id, value]) => ({
            ...(value as Omit<Field, "id">),
            id,
          }))
        );
      },
      err => setError(err.message)
    );

    return () => {
      unsubDatasets();
      unsubUsers();
      unsubFields();
    };
  }, []);

  const filteredDatasets = useMemo(
    () =>
      datasets.filter(d =>
        `${d.name} ${d.type}`
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [datasets, search]
  );

  const filteredUsers = useMemo(
    () =>
      users.filter(u =>
        `${u.name} ${u.email} ${u.role}`
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [users, search]
  );

  const filteredFields = useMemo(
    () =>
      fields.filter(f =>
        `${f.name} ${f.location} ${f.assignedToName}`
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [fields, search]
  );

  function openModal(next: Modal) {
    setError("");
    setModal(next);
  }

  async function runAction(
    action: () => Promise<void>,
    success: string
  ) {
    setBusy(true);
    setError("");
    setNotice("");

    try {
      await action();
      setNotice(success);
      setModal(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setBusy(false);
    }
  }

  function addDataset() {
    if (!datasetName.trim()) {
      setError("Enter a dataset name.");
      return;
    }

    void runAction(async () => {
      await set(push(ref(db, "datasets")), {
        name: datasetName.trim(),
        type: datasetType,
        status: "active",
        records: 0,
        uploadedBy: "Admin User",
        size: "0 MB",
      });
      setDatasetName("");
    }, "Dataset record created.");
  }

  function addUser() {
    if (!userName.trim() || !userEmail.trim()) {
      setError("Enter the user name and email.");
      return;
    }

    if (userPassword.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    void runAction(async () => {
      const credential =
        await createUserWithEmailAndPassword(
          secondaryAuth,
          userEmail.trim(),
          userPassword
        );

      try {
        await updateProfile(credential.user, {
          displayName: userName.trim(),
        });

        await set(
          ref(db, `users/${credential.user.uid}`),
          {
            name: userName.trim(),
            email: userEmail.trim(),
            role: userRole,
            status: "active",
            lastLogin: "Never",
            fields: 0,
          }
        );
      } finally {
        await signOut(secondaryAuth);
      }

      setUserName("");
      setUserEmail("");
      setUserPassword("");
    }, "User created successfully.");
  }

  function addField() {
    if (!fieldName.trim()) {
      setError("Enter a field name.");
      return;
    }

    void runAction(async () => {
      await set(push(ref(db, "fields")), {
        name: fieldName.trim(),
        location: fieldLocation.trim() || "Unspecified",
        assignedTo: "",
        assignedToName: "Unassigned",
      });

      setFieldName("");
      setFieldLocation("");
    }, "Field created successfully.");
  }

  function deleteRecord(
    collection: "datasets" | "users" | "fields",
    id: string
  ) {
    if (!window.confirm("Delete this record?")) return;

    void runAction(
      () => remove(ref(db, `${collection}/${id}`)),
      "Record deleted."
    );
  }

  function assignField(fieldId: string, userId: string) {
    const user = users.find(u => u.id === userId);

    void runAction(
      () =>
        update(ref(db, `fields/${fieldId}`), {
          assignedTo: userId,
          assignedToName: user?.name || "Unassigned",
        }),
      "Field assignment updated."
    );
  }

  function downloadReport() {
    const pdf = new jsPDF();

    pdf.setFontSize(20);
    pdf.setTextColor(20, 110, 70);
    pdf.text("AgroEye Admin Report", 14, 20);

    pdf.setFontSize(10);
    pdf.setTextColor(100);
    pdf.text(
      `Generated: ${new Date().toLocaleString()}`,
      14,
      28
    );

    autoTable(pdf, {
      startY: 38,
      head: [["Dataset", "Type", "Status", "Records"]],
      body: datasets.map(d => [
        d.name,
        d.type,
        d.status,
        String(d.records ?? 0),
      ]),
      headStyles: { fillColor: [5, 150, 105] },
    });

    let y =
      ((pdf as any).lastAutoTable?.finalY ?? 38) + 12;

    autoTable(pdf, {
      startY: y,
      head: [["Name", "Email", "Role", "Status"]],
      body: users.map(u => [
        u.name,
        u.email,
        u.role,
        u.status,
      ]),
      headStyles: { fillColor: [5, 150, 105] },
    });

    y = ((pdf as any).lastAutoTable?.finalY ?? y) + 12;

    autoTable(pdf, {
      startY: y,
      head: [["Field", "Location", "Assigned To"]],
      body: fields.map(f => [
        f.name,
        f.location,
        f.assignedToName || "Unassigned",
      ]),
      headStyles: { fillColor: [5, 150, 105] },
    });

    pdf.save("AgroEye_Admin_Report.pdf");
  }

  const stats = [
    {
      label: "Total Datasets",
      value: datasets.length,
      icon: Database,
      bg: "bg-emerald-50",
      color: "text-emerald-600",
    },
    {
      label: "Registered Users",
      value: users.length,
      icon: Users,
      bg: "bg-blue-50",
      color: "text-blue-600",
    },
    {
      label: "Managed Fields",
      value: fields.length,
      icon: MapPin,
      bg: "bg-violet-50",
      color: "text-violet-600",
    },
    {
      label: "Active Datasets",
      value: datasets.filter(d => d.status === "active")
        .length,
      icon: Activity,
      bg: "bg-orange-50",
      color: "text-orange-600",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f5f8f6] text-slate-800">
      {/* Header */}
      <header className="border-b border-slate-100 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-600 p-3 text-white">
              <Sprout className="h-7 w-7" />
            </div>

            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                AgroEye
                <span className="ml-2 text-emerald-600">
                  Admin
                </span>
              </h1>
              <p className="text-xs text-slate-500">
                Smart Paddy Monitoring System
              </p>
            </div>
          </div>

          <button
            onClick={downloadReport}
            className={buttonClass}
          >
            <Download className="h-4 w-4" />
            Download Report
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-7 px-5 py-7 lg:px-8">
        {/* Welcome */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-900 via-emerald-800 to-green-600 p-7 text-white shadow-xl shadow-emerald-900/10 sm:p-10">
          <div className="relative z-10 max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium">
              <ShieldCheck className="h-4 w-4" />
              Administration Dashboard
            </div>

            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Welcome to AgroEye
            </h2>

            <p className="mt-3 max-w-lg text-sm leading-7 text-emerald-50/90">
              Manage your agricultural datasets, users,
              and paddy fields from one smart dashboard.
            </p>
          </div>

          <Leaf className="absolute -bottom-14 -right-10 h-72 w-72 rotate-[-25deg] text-white/10" />
        </section>

        {/* Messages */}
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
          >
            {notice}
          </div>
        )}

        {/* Statistics */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map(stat => (
            <div
              key={stat.label}
              className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div
                  className={`rounded-xl p-3 ${stat.bg} ${stat.color}`}
                >
                  <stat.icon className="h-6 w-6" />
                </div>
                <span className="text-xs font-medium text-slate-400">
                  Live Data
                </span>
              </div>

              <p className="mt-5 text-3xl font-bold text-slate-900">
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {stat.label}
              </p>
            </div>
          ))}
        </section>

        {/* Management */}
        <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 sm:p-7 lg:flex-row lg:items-center">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Resource Management
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Manage your system information
              </p>
            </div>

            <button
              onClick={() =>
                openModal(
                  tab === "datasets"
                    ? "dataset"
                    : tab === "users"
                      ? "user"
                      : "field"
                )
              }
              className={buttonClass}
            >
              <Plus className="h-4 w-4" />
              {tab === "datasets"
                ? "Add Dataset"
                : tab === "users"
                  ? "Add User"
                  : "Add Field"}
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 overflow-x-auto border-b border-slate-100 px-5 pt-4 sm:px-7">
            {(
              [
                ["datasets", "Datasets", Database],
                ["users", "Users", Users],
                ["fields", "Fields", MapPin],
              ] as const
            ).map(([key, label, Icon]) => (
              <button
                key={key}
                onClick={() => {
                  setTab(key);
                  setSearch("");
                }}
                className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${tab === key
                    ? "border-emerald-600 text-emerald-700"
                    : "border-transparent text-slate-500 hover:text-emerald-600"
                  }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="p-5 sm:p-7">
            <div className="relative mb-6 max-w-md">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className={`${inputClass} pl-11`}
                placeholder={`Search ${tab}...`}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div className="overflow-x-auto">
              {/* Datasets */}
              {tab === "datasets" && (
                <table className="w-full min-w-[650px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-5 py-4">Dataset</th>
                      <th className="px-5 py-4">Type</th>
                      <th className="px-5 py-4">Records</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredDatasets.map(d => (
                      <tr
                        key={d.id}
                        className="hover:bg-slate-50/80"
                      >
                        <td className="px-5 py-4 font-semibold">
                          {d.name}
                        </td>
                        <td className="px-5 py-4 capitalize">
                          <span className="inline-flex items-center gap-2">
                            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                            {d.type}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          {d.records ?? 0}
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={d.status} />
                        </td>
                        <td className="px-5 py-4">
                          <button
                            title="Delete dataset"
                            onClick={() =>
                              deleteRecord("datasets", d.id)
                            }
                            className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Users */}
              {tab === "users" && (
                <table className="w-full min-w-[650px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-5 py-4">User</th>
                      <th className="px-5 py-4">Email</th>
                      <th className="px-5 py-4">Role</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map(u => (
                      <tr
                        key={u.id}
                        className="hover:bg-slate-50/80"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-700">
                              {(u.name || "U")
                                .charAt(0)
                                .toUpperCase()}
                            </div>
                            <span className="font-semibold">
                              {u.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {u.email}
                        </td>
                        <td className="px-5 py-4 capitalize">
                          {u.role}
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={u.status} />
                        </td>
                        <td className="px-5 py-4">
                          <button
                            title="Delete user database record"
                            onClick={() =>
                              deleteRecord("users", u.id)
                            }
                            className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Fields */}
              {tab === "fields" && (
                <table className="w-full min-w-[650px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-5 py-4">Field</th>
                      <th className="px-5 py-4">Location</th>
                      <th className="px-5 py-4">Assigned User</th>
                      <th className="px-5 py-4">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredFields.map(f => (
                      <tr
                        key={f.id}
                        className="hover:bg-slate-50/80"
                      >
                        <td className="px-5 py-4 font-semibold">
                          <span className="inline-flex items-center gap-2">
                            <Sprout className="h-4 w-4 text-emerald-600" />
                            {f.name}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          {f.location}
                        </td>
                        <td className="px-5 py-4">
                          <select
                            value={f.assignedTo || ""}
                            onChange={e =>
                              assignField(f.id, e.target.value)
                            }
                            className="rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-emerald-500"
                          >
                            <option value="">Unassigned</option>
                            {users.map(u => (
                              <option key={u.id} value={u.id}>
                                {u.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-5 py-4">
                          <button
                            title="Delete field"
                            onClick={() =>
                              deleteRecord("fields", f.id)
                            }
                            className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {(
                tab === "datasets"
                  ? filteredDatasets.length === 0
                  : tab === "users"
                    ? filteredUsers.length === 0
                    : filteredFields.length === 0
              ) && (
                  <div className="py-16 text-center">
                    <Database className="mx-auto h-10 w-10 text-slate-300" />
                    <p className="mt-3 font-medium text-slate-600">
                      No records found
                    </p>
                  </div>
                )}
            </div>
          </div>
        </section>

        <footer className="py-4 text-center text-xs text-slate-400">
          AgroEye Smart Paddy Monitoring System
        </footer>
      </main>

      {/* Modal */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onMouseDown={e => {
            if (e.target === e.currentTarget) {
              setModal(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Add ${modal}`}
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl sm:p-8"
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {modal === "dataset"
                    ? "Add New Dataset"
                    : modal === "user"
                      ? "Create New User"
                      : "Add New Field"}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Enter the required information
                </p>
              </div>

              <button
                onClick={() => setModal(null)}
                className="rounded-lg p-2 hover:bg-slate-100"
                aria-label="Close dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {modal === "dataset" && (
                <>
                  <input
                    className={inputClass}
                    placeholder="Dataset Name"
                    value={datasetName}
                    onChange={e =>
                      setDatasetName(e.target.value)
                    }
                  />
                  <select
                    className={inputClass}
                    value={datasetType}
                    onChange={e =>
                      setDatasetType(
                        e.target.value as "image" | "csv"
                      )
                    }
                  >
                    <option value="image">Image Dataset</option>
                    <option value="csv">CSV Dataset</option>
                  </select>
                  <p className="text-xs text-slate-500">
                    This creates a dataset entry, not a
                    physical file upload.
                  </p>
                </>
              )}

              {modal === "user" && (
                <>
                  <input
                    className={inputClass}
                    placeholder="Full Name"
                    value={userName}
                    onChange={e =>
                      setUserName(e.target.value)
                    }
                  />
                  <input
                    className={inputClass}
                    type="email"
                    placeholder="Email Address"
                    value={userEmail}
                    onChange={e =>
                      setUserEmail(e.target.value)
                    }
                  />
                  <input
                    className={inputClass}
                    type="password"
                    placeholder="Password (minimum 6 characters)"
                    value={userPassword}
                    onChange={e =>
                      setUserPassword(e.target.value)
                    }
                  />
                  <select
                    className={inputClass}
                    value={userRole}
                    onChange={e =>
                      setUserRole(
                        e.target.value as
                        | "admin"
                        | "manager"
                        | "user"
                      )
                    }
                  >
                    <option value="user">User</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </>
              )}

              {modal === "field" && (
                <>
                  <input
                    className={inputClass}
                    placeholder="Field Name"
                    value={fieldName}
                    onChange={e =>
                      setFieldName(e.target.value)
                    }
                  />
                  <input
                    className={inputClass}
                    placeholder="Location"
                    value={fieldLocation}
                    onChange={e =>
                      setFieldLocation(e.target.value)
                    }
                  />
                </>
              )}

              {error && (
                <p className="text-sm text-red-600">
                  {error}
                </p>
              )}

              <button
                disabled={busy}
                onClick={
                  modal === "dataset"
                    ? addDataset
                    : modal === "user"
                      ? addUser
                      : addField
                }
                className={`${buttonClass} w-full`}
              >
                {busy ? (
                  "Please wait..."
                ) : (
                  <>
                    {modal === "user" ? (
                      <UserPlus className="h-4 w-4" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    {modal === "dataset"
                      ? "Save Dataset"
                      : modal === "user"
                        ? "Create User"
                        : "Save Field"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPanel;

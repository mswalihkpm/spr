'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import {
  Settings,
  Users,
  Building,
  GraduationCap,
  Layers,
  Save,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  History,
  Trophy,
  Sparkles,
  Key,
  Shield,
  Lock,
  RefreshCw,
  Calendar,
  Sliders,
} from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<string>('INSTITUTION');
  const [institutionName, setInstitutionName] = useState('Madin School of Excellence');
  const [autoscrollSpeed, setAutoscrollSpeed] = useState('10');
  const [introFooterText, setIntroFooterText] = useState('2026 version 0.1');

  // Master Data
  const [masterData, setMasterData] = useState<any>({});
  const [usersList, setUsersList] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // User Creation Modal
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'TEACHER',
  });

  // Admin Password Reset Modal
  const [adminResetModalOpen, setAdminResetModalOpen] = useState(false);
  const [adminResetUser, setAdminResetUser] = useState<any>(null);
  const [adminResetPassword, setAdminResetPassword] = useState('');
  const [adminResetForceChange, setAdminResetForceChange] = useState(false);

  // Entity Modal (Add/Edit School, Class, Subject, Program, Competition, Level, Exam, Term)
  const [entityModalOpen, setEntityModalOpen] = useState(false);
  const [entityType, setEntityType] = useState<string>('SCHOOL');
  const [editingEntityId, setEditingEntityId] = useState<string | null>(null);
  const [entityData, setEntityData] = useState<any>({});

  // User bulk selection & deletion state
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [bulkDeletingUsers, setBulkDeletingUsers] = useState(false);
  const [confirmBulkDeleteUsersOpen, setConfirmBulkDeleteUsersOpen] = useState(false);

  // Audit logs bulk selection & deletion state
  const [selectedAuditLogIds, setSelectedAuditLogIds] = useState<string[]>([]);
  const [bulkDeletingAuditLogs, setBulkDeletingAuditLogs] = useState(false);
  const [confirmBulkDeleteAuditLogsOpen, setConfirmBulkDeleteAuditLogsOpen] = useState(false);

  // Assessment Exams & Terms bulk selection & deletion state
  const [selectedExamIds, setSelectedExamIds] = useState<string[]>([]);
  const [bulkDeletingExams, setBulkDeletingExams] = useState(false);
  const [confirmBulkDeleteExamsOpen, setConfirmBulkDeleteExamsOpen] = useState(false);

  const [selectedTermIds, setSelectedTermIds] = useState<string[]>([]);
  const [bulkDeletingTerms, setBulkDeletingTerms] = useState(false);
  const [confirmBulkDeleteTermsOpen, setConfirmBulkDeleteTermsOpen] = useState(false);

  // Entities (Schools, Classes, Subjects) bulk selection & deletion state
  const [selectedSchoolIds, setSelectedSchoolIds] = useState<string[]>([]);
  const [bulkDeletingSchools, setBulkDeletingSchools] = useState(false);
  const [confirmBulkDeleteSchoolsOpen, setConfirmBulkDeleteSchoolsOpen] = useState(false);

  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [bulkDeletingClasses, setBulkDeletingClasses] = useState(false);
  const [confirmBulkDeleteClassesOpen, setConfirmBulkDeleteClassesOpen] = useState(false);

  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [bulkDeletingSubjects, setBulkDeletingSubjects] = useState(false);
  const [confirmBulkDeleteSubjectsOpen, setConfirmBulkDeleteSubjectsOpen] = useState(false);

  // Users Handlers
  const handleToggleSelectAllUsers = () => {
    const allSelected = usersList.length > 0 && usersList.every((u) => selectedUserIds.includes(u.id));
    if (allSelected) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(usersList.map((u) => u.id));
    }
  };

  const handleToggleSelectUser = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkDeleteUsers = async () => {
    if (selectedUserIds.length === 0) return;
    setBulkDeletingUsers(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'BULK_DELETE_USERS', userIds: selectedUserIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to bulk delete users.');

      const count = selectedUserIds.length;
      setSelectedUserIds([]);
      setConfirmBulkDeleteUsersOpen(false);
      setStatusMsg({ type: 'success', text: `Successfully deleted ${count} user account(s).` });
      fetchSettings();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error bulk deleting users.' });
    } finally {
      setBulkDeletingUsers(false);
    }
  };

  // Audit Logs Handlers
  const handleToggleSelectAllAuditLogs = () => {
    const allSelected = auditLogs.length > 0 && auditLogs.every((l) => selectedAuditLogIds.includes(l.id));
    if (allSelected) {
      setSelectedAuditLogIds([]);
    } else {
      setSelectedAuditLogIds(auditLogs.map((l) => l.id));
    }
  };

  const handleToggleSelectAuditLog = (id: string) => {
    setSelectedAuditLogIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkDeleteAuditLogs = async () => {
    if (selectedAuditLogIds.length === 0) return;
    setBulkDeletingAuditLogs(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'BULK_DELETE_AUDIT_LOGS', logIds: selectedAuditLogIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to bulk delete audit logs.');

      const count = selectedAuditLogIds.length;
      setSelectedAuditLogIds([]);
      setConfirmBulkDeleteAuditLogsOpen(false);
      setStatusMsg({ type: 'success', text: `Successfully deleted ${count} audit log entry(ies).` });
      fetchSettings();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error bulk deleting audit logs.' });
    } finally {
      setBulkDeletingAuditLogs(false);
    }
  };

  const handleClearAllAuditLogs = async () => {
    if (!confirm('Are you sure you want to completely clear ALL audit log entries? This action is irreversible.')) return;
    setBulkDeletingAuditLogs(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CLEAR_AUDIT_LOGS' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to clear audit logs.');

      setSelectedAuditLogIds([]);
      setStatusMsg({ type: 'success', text: data.message || 'Audit logs cleared successfully.' });
      fetchSettings();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error clearing audit logs.' });
    } finally {
      setBulkDeletingAuditLogs(false);
    }
  };

  // Bulk Exam Handlers
  const handleToggleSelectAllExams = () => {
    const exams = masterData.exams || [];
    const allSelected = exams.length > 0 && exams.every((e: any) => selectedExamIds.includes(e.id));
    if (allSelected) {
      setSelectedExamIds([]);
    } else {
      setSelectedExamIds(exams.map((e: any) => e.id));
    }
  };

  const handleToggleSelectExam = (id: string) => {
    setSelectedExamIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkDeleteExams = async () => {
    if (selectedExamIds.length === 0) return;
    setBulkDeletingExams(true);
    try {
      const res = await fetch('/api/exams', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedExamIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to bulk delete exams.');

      const count = selectedExamIds.length;
      setSelectedExamIds([]);
      setConfirmBulkDeleteExamsOpen(false);
      setStatusMsg({ type: 'success', text: `Successfully deleted ${count} exam(s).` });
      fetchSettings();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error bulk deleting exams.' });
    } finally {
      setBulkDeletingExams(false);
    }
  };

  // Bulk Term Handlers
  const handleToggleSelectAllTerms = () => {
    const terms = masterData.terms || [];
    const allSelected = terms.length > 0 && terms.every((t: any) => selectedTermIds.includes(t.id));
    if (allSelected) {
      setSelectedTermIds([]);
    } else {
      setSelectedTermIds(terms.map((t: any) => t.id));
    }
  };

  const handleToggleSelectTerm = (id: string) => {
    setSelectedTermIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkDeleteTerms = async () => {
    if (selectedTermIds.length === 0) return;
    setBulkDeletingTerms(true);
    try {
      const res = await fetch('/api/terms', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedTermIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to bulk delete terms.');

      const count = selectedTermIds.length;
      setSelectedTermIds([]);
      setConfirmBulkDeleteTermsOpen(false);
      setStatusMsg({ type: 'success', text: `Successfully deleted ${count} assessment term(s).` });
      fetchSettings();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error bulk deleting terms.' });
    } finally {
      setBulkDeletingTerms(false);
    }
  };

  // Bulk Schools Handlers
  const handleToggleSelectAllSchools = () => {
    const schools = masterData.schools || [];
    const allSelected = schools.length > 0 && schools.every((s: any) => selectedSchoolIds.includes(s.id));
    if (allSelected) {
      setSelectedSchoolIds([]);
    } else {
      setSelectedSchoolIds(schools.map((s: any) => s.id));
    }
  };

  const handleToggleSelectSchool = (id: string) => {
    setSelectedSchoolIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkDeleteSchools = async () => {
    if (selectedSchoolIds.length === 0) return;
    setBulkDeletingSchools(true);
    try {
      const res = await fetch('/api/academic', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'SCHOOL', ids: selectedSchoolIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to bulk delete schools.');

      const count = selectedSchoolIds.length;
      setSelectedSchoolIds([]);
      setConfirmBulkDeleteSchoolsOpen(false);
      setStatusMsg({ type: 'success', text: `Successfully deleted ${count} school(s).` });
      fetchSettings();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error bulk deleting schools.' });
    } finally {
      setBulkDeletingSchools(false);
    }
  };

  // Bulk Classes Handlers
  const handleToggleSelectAllClasses = () => {
    const classes = masterData.classes || [];
    const allSelected = classes.length > 0 && classes.every((c: any) => selectedClassIds.includes(c.id));
    if (allSelected) {
      setSelectedClassIds([]);
    } else {
      setSelectedClassIds(classes.map((c: any) => c.id));
    }
  };

  const handleToggleSelectClass = (id: string) => {
    setSelectedClassIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkDeleteClasses = async () => {
    if (selectedClassIds.length === 0) return;
    setBulkDeletingClasses(true);
    try {
      const res = await fetch('/api/academic', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'CLASS', ids: selectedClassIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to bulk delete classes.');

      const count = selectedClassIds.length;
      setSelectedClassIds([]);
      setConfirmBulkDeleteClassesOpen(false);
      setStatusMsg({ type: 'success', text: `Successfully deleted ${count} class(es).` });
      fetchSettings();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error bulk deleting classes.' });
    } finally {
      setBulkDeletingClasses(false);
    }
  };

  // Bulk Subjects Handlers
  const handleToggleSelectAllSubjects = () => {
    const subjects = masterData.subjects || [];
    const allSelected = subjects.length > 0 && subjects.every((s: any) => selectedSubjectIds.includes(s.id));
    if (allSelected) {
      setSelectedSubjectIds([]);
    } else {
      setSelectedSubjectIds(subjects.map((s: any) => s.id));
    }
  };

  const handleToggleSelectSubject = (id: string) => {
    setSelectedSubjectIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkDeleteSubjects = async () => {
    if (selectedSubjectIds.length === 0) return;
    setBulkDeletingSubjects(true);
    try {
      const res = await fetch('/api/academic', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'SUBJECT', ids: selectedSubjectIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to bulk delete subjects.');

      const count = selectedSubjectIds.length;
      setSelectedSubjectIds([]);
      setConfirmBulkDeleteSubjectsOpen(false);
      setStatusMsg({ type: 'success', text: `Successfully deleted ${count} subject(s).` });
      fetchSettings();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error bulk deleting subjects.' });
    } finally {
      setBulkDeletingSubjects(false);
    }
  };


  const fetchSettings = async () => {
    try {
      setLoading(true);
      const [resMaster, resSettings, resLogs] = await Promise.all([
        fetch('/api/academic'),
        fetch('/api/settings'),
        fetch('/api/audit-logs?limit=40'),
      ]);

      const dataMaster = await resMaster.json();
      const dataSettings = await resSettings.json();
      const dataLogs = await resLogs.json();

      setMasterData(dataMaster);
      if (dataSettings.settings) {
        if (dataSettings.settings.INSTITUTION_NAME) setInstitutionName(dataSettings.settings.INSTITUTION_NAME);
        if (dataSettings.settings.DISPLAY_AUTOSCROLL_INTERVAL) setAutoscrollSpeed(dataSettings.settings.DISPLAY_AUTOSCROLL_INTERVAL);
        if (dataSettings.settings.APP_INTRO_FOOTER) setIntroFooterText(dataSettings.settings.APP_INTRO_FOOTER);
      }
      if (dataSettings.users) setUsersList(dataSettings.users);
      if (dataLogs.logs) setAuditLogs(dataLogs.logs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveGeneralSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SAVE_SETTINGS',
          settings: {
            INSTITUTION_NAME: institutionName,
            DISPLAY_AUTOSCROLL_INTERVAL: autoscrollSpeed,
            APP_INTRO_FOOTER: introFooterText,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (typeof window !== 'undefined') {
        localStorage.setItem('spr_intro_footer', introFooterText);
      }

      setStatusMsg({ type: 'success', text: 'System and intro footer settings saved successfully.' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_USER',
          userData: newUser,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setStatusMsg({ type: 'success', text: `User ${newUser.name} created successfully.` });
      setUserModalOpen(false);
      setNewUser({ name: '', email: '', password: '', role: 'TEACHER' });
      fetchSettings();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to permanently delete user "${userName}"? This cannot be undone.`)) {
      return;
    }
    setStatusMsg(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'DELETE_USER', userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStatusMsg({ type: 'success', text: `User "${userName}" deleted successfully.` });
      fetchSettings();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    setStatusMsg(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'UPDATE_USER_ROLE', userId, newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStatusMsg({ type: 'success', text: 'User role updated.' });
      fetchSettings();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  const handleUpdateUserStatus = async (userId: string, newStatus: string) => {
    setStatusMsg(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'UPDATE_USER_STATUS', userId, newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStatusMsg({ type: 'success', text: `User status changed to ${newStatus}.` });
      fetchSettings();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  const handleAdminResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminResetUser || !adminResetPassword) return;
    setStatusMsg(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ADMIN_RESET_PASSWORD',
          userId: adminResetUser.id,
          newPassword: adminResetPassword,
          forceChange: adminResetForceChange,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStatusMsg({ type: 'success', text: `Password for "${adminResetUser.name}" reset successfully.` });
      setAdminResetModalOpen(false);
      setAdminResetUser(null);
      setAdminResetPassword('');
      fetchSettings();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  // Open modal for Adding an entity
  const handleOpenAdd = (type: string, defaults: any = {}) => {
    setEntityType(type);
    setEditingEntityId(null);
    setEntityData(defaults);
    setEntityModalOpen(true);
  };

  // Open modal for Editing an entity
  const handleOpenEdit = (type: string, item: any) => {
    setEntityType(type);
    setEditingEntityId(item.id);
    setEntityData({ ...item });
    setEntityModalOpen(true);
  };

  // Save Entity (POST or PUT)
  const handleSaveEntity = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    try {
      const method = editingEntityId ? 'PUT' : 'POST';
      const body = editingEntityId
        ? { type: entityType, id: editingEntityId, data: entityData }
        : { type: entityType, data: entityData };

      const res = await fetch('/api/academic', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setStatusMsg({
        type: 'success',
        text: `${entityType} ${editingEntityId ? 'updated' : 'created'} successfully.`,
      });
      setEntityModalOpen(false);
      fetchSettings();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  // Delete Entity
  const handleDeleteEntity = async (type: string, id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${type} "${name}"? Linked records may be affected.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/academic?type=${type}&id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setStatusMsg({ type: 'success', text: `${type} "${name}" deleted.` });
      fetchSettings();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  const tabs = [
    { id: 'INSTITUTION', name: 'Institution', icon: Building },
    { id: 'ASSESSMENTS', name: 'Assessment Terms & Exams', icon: Calendar },
    { id: 'ENTITIES', name: 'Schools & Classes', icon: GraduationCap },
    { id: 'LEVELS', name: 'Levels & Multipliers', icon: Sliders },
    { id: 'USERS', name: 'User Management', icon: Users },
    { id: 'AUDIT', name: 'Audit Trail', icon: History },
  ];

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                Super Admin Configuration
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-1 flex items-center space-x-2">
              <Settings className="w-5 h-5 text-madin-900" />
              <span>Platform Settings & Master Data</span>
            </h2>
            <p className="text-xs text-slate-500">
              Full CRUD management for Assessment Terms, Exams, Schools, Classes, Levels, Users, and Audit Logs. Subjects and programmes are typed on-the-fly directly in their respective scoring pages.
            </p>
          </div>
        </div>

        {/* Status Message */}
        {statusMsg && (
          <div
            className={`p-4 rounded-2xl border text-xs flex items-center space-x-2.5 ${
              statusMsg.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-semibold">{statusMsg.text}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex overflow-x-auto space-x-1.5 p-1.5 bg-white rounded-2xl border border-slate-200 shadow-subtle">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  active
                    ? 'bg-madin-900 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? 'text-gold-400' : 'text-slate-400'}`} />
                <span>{t.name}</span>
              </button>
            );
          })}
        </div>

        {/* 1. Institution General Tab */}
        {activeTab === 'INSTITUTION' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-5">
            <h3 className="text-sm font-bold text-slate-900">Institution & Broadcast Settings</h3>

            <form onSubmit={handleSaveGeneralSettings} className="space-y-4 max-w-xl">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Official Institution Name
                </label>
                <input
                  type="text"
                  required
                  value={institutionName}
                  onChange={(e) => setInstitutionName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-madin-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  App Intro Splash Footer (Version / Copyright Tag)
                </label>
                <input
                  type="text"
                  required
                  value={introFooterText}
                  onChange={(e) => setIntroFooterText(e.target.value)}
                  placeholder="e.g. 2026 version 0.1"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-madin-900"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  This custom text is displayed at the bottom of the video splash screen on initial app launch.
                </p>
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 bg-madin-900 text-white text-xs font-bold rounded-xl hover:bg-madin-950 shadow"
              >
                Save Institution Settings
              </button>
            </form>
          </div>
        )}

        {/* Assessment Terms & Exams Tab */}
        {activeTab === 'ASSESSMENTS' && (
          <div className="space-y-6">
            {/* Assessment Terms Management */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Assessment Terms & Academic Periods</h3>
                  <p className="text-xs text-slate-500">Add, edit, and delete evaluation terms (Term 1, Term 2, Annual, etc.)</p>
                </div>
                <div className="flex items-center space-x-2">
                  {masterData.terms && masterData.terms.length > 0 && (
                    <button
                      type="button"
                      onClick={handleToggleSelectAllTerms}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                    >
                      {masterData.terms.every((t: any) => selectedTermIds.includes(t.id)) ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                  <button
                    onClick={() => handleOpenAdd('TERM', { name: '', code: '', isCurrent: false })}
                    className="px-3.5 py-1.5 bg-madin-900 text-white rounded-lg text-xs font-semibold flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5 text-gold-400" />
                    <span>+ Add Term</span>
                  </button>
                </div>
              </div>

              {/* Bulk Term Delete Toolbar */}
              {selectedTermIds.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl flex items-center justify-between shadow-xs animate-fade-in">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                    <span className="text-xs font-bold text-rose-950">
                      {selectedTermIds.length} term(s) selected
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setSelectedTermIds([])}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-rose-100 rounded-xl transition"
                    >
                      Deselect
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmBulkDeleteTermsOpen(true)}
                      className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-sm transition hover:scale-105 active:scale-95"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Selected ({selectedTermIds.length})</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {masterData.terms?.map((term: any) => {
                  const isSelected = selectedTermIds.includes(term.id);
                  return (
                    <div key={term.id} className={`p-4 rounded-xl border transition flex items-center justify-between ${isSelected ? 'border-rose-300 bg-rose-50/50' : 'border-slate-200 bg-slate-50'}`}>
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectTerm(term.id)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-600 cursor-pointer"
                        />
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-slate-900">{term.name}</span>
                            {term.isCurrent && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800">
                                Active
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">{term.code}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleOpenEdit('TERM', term)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 rounded"
                          title="Edit Term"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteEntity('TERM', term.id, term.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                          title="Delete Term"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Exams / Evaluation Periods Management */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Exams & Assessment Events</h3>
                  <p className="text-xs text-slate-500">Add, edit, and delete examination events across categories</p>
                </div>
                <button
                  onClick={() =>
                    handleOpenAdd('EXAM', {
                      name: '',
                      categoryId: masterData.categories?.[0]?.id || '',
                      termId: masterData.terms?.[0]?.id || '',
                    })
                  }
                  className="px-3.5 py-1.5 bg-madin-900 text-white rounded-lg text-xs font-semibold flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5 text-gold-400" />
                  <span>+ Add Exam</span>
                </button>
              </div>

              {/* Bulk Exam Delete Toolbar */}
              {selectedExamIds.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl flex items-center justify-between shadow-xs animate-fade-in">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                    <span className="text-xs font-bold text-rose-950">
                      {selectedExamIds.length} exam event(s) selected
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setSelectedExamIds([])}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-rose-100 rounded-xl transition"
                    >
                      Deselect
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmBulkDeleteExamsOpen(true)}
                      className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-sm transition hover:scale-105 active:scale-95"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Selected ({selectedExamIds.length})</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={
                            (masterData.exams || []).length > 0 &&
                            (masterData.exams || []).every((e: any) => selectedExamIds.includes(e.id))
                          }
                          onChange={handleToggleSelectAllExams}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-600 cursor-pointer"
                          title="Select All Exams"
                        />
                      </th>
                      <th className="py-2.5 px-3">Exam Name</th>
                      <th className="py-2.5 px-3">Category Wing</th>
                      <th className="py-2.5 px-3">Term Period</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {masterData.exams?.map((ex: any) => {
                      const isSelected = selectedExamIds.includes(ex.id);
                      return (
                        <tr key={ex.id} className={`hover:bg-slate-50 ${isSelected ? 'bg-rose-50/50' : ''}`}>
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectExam(ex.id)}
                              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-600 cursor-pointer"
                            />
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">{ex.name}</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                              {ex.category?.name}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-600">
                            {ex.term?.name || 'Annual'}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end space-x-1">
                              <button
                                onClick={() => handleOpenEdit('EXAM', ex)}
                                className="p-1 text-slate-400 hover:text-blue-600"
                                title="Edit Exam"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteEntity('EXAM', ex.id, ex.name)}
                                className="p-1 text-slate-400 hover:text-rose-600"
                                title="Delete Exam"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 2. Schools & Classes Tab */}
        {activeTab === 'ENTITIES' && (
          <div className="space-y-6">
            {/* Schools List */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Registered Institutional Schools</h3>
                  <p className="text-xs text-slate-500">Database entities under Madin School of Excellence</p>
                </div>
                <div className="flex items-center space-x-2">
                  {masterData.schools && masterData.schools.length > 0 && (
                    <button
                      type="button"
                      onClick={handleToggleSelectAllSchools}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                    >
                      {masterData.schools.every((s: any) => selectedSchoolIds.includes(s.id)) ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                  <button
                    onClick={() => handleOpenAdd('SCHOOL', { name: '', code: '' })}
                    className="px-3 py-1.5 bg-madin-900 text-white rounded-lg text-xs font-semibold flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5 text-gold-400" />
                    <span>+ Add School</span>
                  </button>
                </div>
              </div>

              {/* Bulk School Delete Toolbar */}
              {selectedSchoolIds.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl flex items-center justify-between shadow-xs animate-fade-in">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                    <span className="text-xs font-bold text-rose-950">
                      {selectedSchoolIds.length} school(s) selected
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setSelectedSchoolIds([])}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-rose-100 rounded-xl transition"
                    >
                      Deselect
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmBulkDeleteSchoolsOpen(true)}
                      className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-sm transition hover:scale-105 active:scale-95"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Selected ({selectedSchoolIds.length})</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {masterData.schools?.map((s: any) => {
                  const isSelected = selectedSchoolIds.includes(s.id);
                  return (
                    <div key={s.id} className={`p-3.5 rounded-xl border transition flex items-center justify-between ${isSelected ? 'border-rose-300 bg-rose-50/50' : 'border-slate-200 bg-slate-50'}`}>
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectSchool(s.id)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-600 cursor-pointer"
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-900">{s.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">{s.code}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleOpenEdit('SCHOOL', s)}
                          className="p-1 text-slate-400 hover:text-blue-600 rounded"
                          title="Edit School"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteEntity('SCHOOL', s.id, s.name)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          title="Delete School"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Classes List */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Academic Classes & Grades</h3>
                  <p className="text-xs text-slate-500">Standards (Class 8, 9, 10, +1, +2)</p>
                </div>
                <div className="flex items-center space-x-2">
                  {masterData.classes && masterData.classes.length > 0 && (
                    <button
                      type="button"
                      onClick={handleToggleSelectAllClasses}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                    >
                      {masterData.classes.every((c: any) => selectedClassIds.includes(c.id)) ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                  <button
                    onClick={() => handleOpenAdd('CLASS', { name: '', numericGrade: 8 })}
                    className="px-3 py-1.5 bg-madin-900 text-white rounded-lg text-xs font-semibold flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5 text-gold-400" />
                    <span>+ Add Class</span>
                  </button>
                </div>
              </div>

              {/* Bulk Class Delete Toolbar */}
              {selectedClassIds.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl flex items-center justify-between shadow-xs animate-fade-in">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                    <span className="text-xs font-bold text-rose-950">
                      {selectedClassIds.length} class(es) selected
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setSelectedClassIds([])}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-rose-100 rounded-xl transition"
                    >
                      Deselect
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmBulkDeleteClassesOpen(true)}
                      className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-sm transition hover:scale-105 active:scale-95"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Selected ({selectedClassIds.length})</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {masterData.classes?.map((c: any) => {
                  const isSelected = selectedClassIds.includes(c.id);
                  return (
                    <div key={c.id} className={`p-3.5 rounded-xl border transition relative group ${isSelected ? 'border-rose-300 bg-rose-50/50' : 'border-slate-200 bg-slate-50'}`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-xs font-extrabold text-slate-900">{c.name}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">Grade {c.numericGrade}</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectClass(c.id)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-600 cursor-pointer mt-0.5"
                        />
                      </div>
                      <div className="flex items-center space-x-1 mt-2 pt-2 border-t border-slate-200/60 justify-end">
                        <button
                          onClick={() => handleOpenEdit('CLASS', c)}
                          className="p-1 text-slate-400 hover:text-blue-600"
                          title="Edit Class"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteEntity('CLASS', c.id, c.name)}
                          className="p-1 text-slate-400 hover:text-rose-600"
                          title="Delete Class"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 4. Levels & Multipliers Tab */}
        {activeTab === 'LEVELS' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Competition & Achievement Levels</h3>
                <p className="text-xs text-slate-500">Hierarchical weight multipliers (Campus to International)</p>
              </div>
              <button
                onClick={() =>
                  handleOpenAdd('LEVEL', {
                    name: '',
                    code: '',
                    weightMultiplier: 1.0,
                    displayOrder: (masterData.levels?.length || 0) + 1,
                  })
                }
                className="px-3 py-1.5 bg-madin-900 text-white rounded-lg text-xs font-semibold flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5 text-gold-400" />
                <span>+ Add Level</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Level Name</th>
                    <th className="py-2.5 px-3">Code</th>
                    <th className="py-2.5 px-3 text-center">Multiplier Factor</th>
                    <th className="py-2.5 px-3 text-center">Display Order</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {masterData.levels?.map((lvl: any) => (
                    <tr key={lvl.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{lvl.name}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">{lvl.code}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-madin-900">
                        {lvl.weightMultiplier}x
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-500">{lvl.displayOrder}</td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => handleOpenEdit('LEVEL', lvl)}
                            className="p-1 text-slate-400 hover:text-blue-600"
                            title="Edit Level"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteEntity('LEVEL', lvl.id, lvl.name)}
                            className="p-1 text-slate-400 hover:text-rose-600"
                            title="Delete Level"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 6. User Management Tab */}
        {activeTab === 'USERS' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Administrator & Staff Accounts</h3>
                <p className="text-xs text-slate-500">Role-Based Access Control (Super Admin, Admin, Teacher, Viewer) & Password Security</p>
              </div>
              <button
                onClick={() => setUserModalOpen(true)}
                className="px-3.5 py-1.5 bg-madin-900 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 hover:bg-madin-950 transition"
              >
                <Plus className="w-3.5 h-3.5 text-gold-400" />
                <span>+ Create User</span>
              </button>
            </div>

            {/* Bulk User Delete Toolbar */}
            {selectedUserIds.length > 0 && (
              <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl flex items-center justify-between shadow-xs animate-fade-in">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                  <span className="text-xs font-bold text-rose-950">
                    {selectedUserIds.length} user account(s) selected
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setSelectedUserIds([])}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-rose-100 rounded-xl transition"
                  >
                    Deselect All
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmBulkDeleteUsersOpen(true)}
                    className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-sm transition hover:scale-105 active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Selected ({selectedUserIds.length})</span>
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={usersList.length > 0 && selectedUserIds.length === usersList.length}
                        onChange={handleToggleSelectAllUsers}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-600 cursor-pointer"
                        title="Select All Users"
                      />
                    </th>
                    <th className="py-2.5 px-3">Name</th>
                    <th className="py-2.5 px-3">Email Address</th>
                    <th className="py-2.5 px-3">Assigned Role</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Security Flag</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {usersList.map((u) => {
                    const isSelected = selectedUserIds.includes(u.id);
                    return (
                      <tr key={u.id} className={`hover:bg-slate-50 ${isSelected ? 'bg-rose-50/50' : ''}`}>
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectUser(u.id)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-600 cursor-pointer"
                          />
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{u.name}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{u.email}</td>
                        <td className="py-2.5 px-3">
                          <select
                            value={u.role}
                            onChange={(e) => handleUpdateUserRole(u.id, e.target.value)}
                            className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-madin-900 outline-none focus:ring-1 focus:ring-madin-900"
                          >
                            <option value="SUPER_ADMIN">SUPER ADMIN</option>
                            <option value="ADMIN">ADMIN</option>
                            <option value="CREATIVE_HUB_ADMIN">CREATIVE HUB ADMIN</option>
                            <option value="TEACHER">STAFF / TEACHER</option>
                            <option value="VIEWER">VIEWER</option>
                          </select>
                        </td>
                        <td className="py-2.5 px-3">
                          <button
                            onClick={() => handleUpdateUserStatus(u.id, u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')}
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition ${
                              u.status === 'ACTIVE'
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                                : 'bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100'
                            }`}
                            title="Click to toggle status"
                          >
                            {u.status}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {u.mustChangePassword ? (
                            <span className="text-amber-700 font-semibold text-[10px] bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              Force Password Change
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">Active</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => {
                                setAdminResetUser(u);
                                setAdminResetPassword('');
                                setAdminResetForceChange(false);
                                setAdminResetModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition text-[11px] font-bold flex items-center space-x-1"
                              title="Change User Password"
                            >
                              <Key className="w-3.5 h-3.5 text-amber-600" />
                              <span>Change Password</span>
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u.id, u.name)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                              title="Delete User"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 7. Audit Logs Tab */}
        {activeTab === 'AUDIT' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">System Audit Trail</h3>
                <p className="text-xs text-slate-500">Immutable administrative logs for security and compliance</p>
              </div>
              <div className="flex items-center space-x-2">
                {auditLogs.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllAuditLogs}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 rounded-lg text-xs font-semibold transition flex items-center space-x-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear All Logs</span>
                  </button>
                )}
              </div>
            </div>

            {/* Bulk Audit Delete Toolbar */}
            {selectedAuditLogIds.length > 0 && (
              <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl flex items-center justify-between shadow-xs animate-fade-in">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                  <span className="text-xs font-bold text-rose-950">
                    {selectedAuditLogIds.length} audit log entry(ies) selected
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setSelectedAuditLogIds([])}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-rose-100 rounded-xl transition"
                  >
                    Deselect
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmBulkDeleteAuditLogsOpen(true)}
                    className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-sm transition hover:scale-105 active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Selected ({selectedAuditLogIds.length})</span>
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold sticky top-0">
                  <tr>
                    <th className="py-2 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={auditLogs.length > 0 && auditLogs.every((l) => selectedAuditLogIds.includes(l.id))}
                        onChange={handleToggleSelectAllAuditLogs}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-600 cursor-pointer"
                        title="Select All Logs"
                      />
                    </th>
                    <th className="py-2 px-3">Timestamp</th>
                    <th className="py-2 px-3">Administrator</th>
                    <th className="py-2 px-3">Action</th>
                    <th className="py-2 px-3">Entity</th>
                    <th className="py-2 px-3">Details / Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {auditLogs.map((log) => {
                    const isSelected = selectedAuditLogIds.includes(log.id);
                    return (
                      <tr key={log.id} className={`hover:bg-slate-50 ${isSelected ? 'bg-rose-50/50' : ''}`}>
                        <td className="py-2 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectAuditLog(log.id)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-600 cursor-pointer"
                          />
                        </td>
                        <td className="py-2 px-3 text-slate-500">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="py-2 px-3 font-sans font-semibold text-slate-900">{log.userName || 'System'}</td>
                        <td className="py-2 px-3 font-bold text-madin-800">{log.action}</td>
                        <td className="py-2 px-3 font-sans text-slate-700">{log.entity}</td>
                        <td className="py-2 px-3 text-slate-500 truncate max-w-xs">{log.newValue || log.previousValue || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* User Creation Modal */}
      {userModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-madin-950/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-fade-in">
            <h3 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100">
              Create Admin or Staff User
            </h3>

            <form onSubmit={handleCreateUser} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="Usthad / Teacher Name"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-madin-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="staff@madin.edu.in"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-madin-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Temporary Initial Password *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Min 6 characters (forced to change on login)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-madin-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-madin-900"
                >
                  <option value="SUPER_ADMIN">Super Admin (Full System)</option>
                  <option value="ADMIN">Admin (Students & Scoring)</option>
                  <option value="TEACHER">Teacher / Usthad</option>
                  <option value="VIEWER">Viewer (Read-Only)</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUserModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-madin-900 text-white rounded-xl text-xs font-semibold hover:bg-madin-950 shadow"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Master Entity Add / Edit Modal */}
      {entityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-madin-950/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-fade-in max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100">
              {editingEntityId ? 'Edit' : 'Add New'} {entityType}
            </h3>

            <form onSubmit={handleSaveEntity} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={entityData.name || ''}
                  onChange={(e) => setEntityData({ ...entityData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-madin-900"
                />
              </div>

              {entityType === 'SCHOOL' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">School Code *</label>
                  <input
                    type="text"
                    required
                    value={entityData.code || ''}
                    onChange={(e) => setEntityData({ ...entityData, code: e.target.value })}
                    placeholder="e.g. GBHS-MLP"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-madin-900"
                  />
                </div>
              )}

              {entityType === 'CLASS' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Numeric Grade</label>
                  <input
                    type="number"
                    value={entityData.numericGrade || 8}
                    onChange={(e) => setEntityData({ ...entityData, numericGrade: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-madin-900"
                  />
                </div>
              )}

              {entityType === 'SUBJECT' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Subject Code</label>
                    <input
                      type="text"
                      value={entityData.code || ''}
                      onChange={(e) => setEntityData({ ...entityData, code: e.target.value })}
                      placeholder="e.g. QRN-01"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-madin-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Category Wing</label>
                    <select
                      value={entityData.categoryId || masterData.categories?.[0]?.id || ''}
                      onChange={(e) => setEntityData({ ...entityData, categoryId: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-madin-900"
                    >
                      {masterData.categories?.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Max Score</label>
                    <input
                      type="number"
                      value={entityData.maxScore || 100}
                      onChange={(e) => setEntityData({ ...entityData, maxScore: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-madin-900"
                    />
                  </div>
                </>
              )}

              {entityType === 'PROGRAM' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Organizer</label>
                    <input
                      type="text"
                      value={entityData.organizer || ''}
                      onChange={(e) => setEntityData({ ...entityData, organizer: e.target.value })}
                      placeholder="e.g. Student Council"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-madin-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Level</label>
                    <select
                      value={entityData.levelId || masterData.levels?.[0]?.id || ''}
                      onChange={(e) => setEntityData({ ...entityData, levelId: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-madin-900"
                    >
                      {masterData.levels?.map((lvl: any) => (
                        <option key={lvl.id} value={lvl.id}>
                          {lvl.name} ({lvl.weightMultiplier}x)
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {entityType === 'TERM' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Term Code</label>
                    <input
                      type="text"
                      value={entityData.code || ''}
                      onChange={(e) => setEntityData({ ...entityData, code: e.target.value })}
                      placeholder="e.g. TERM-1, TERM-2, ANNUAL"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-madin-900 font-mono"
                    />
                  </div>

                  <div className="flex items-center space-x-2 pt-1">
                    <input
                      type="checkbox"
                      id="isCurrentTerm"
                      checked={!!entityData.isCurrent}
                      onChange={(e) => setEntityData({ ...entityData, isCurrent: e.target.checked })}
                      className="w-4 h-4 rounded text-madin-900 focus:ring-madin-900"
                    />
                    <label htmlFor="isCurrentTerm" className="text-xs font-semibold text-slate-700 cursor-pointer">
                      Set as Currently Active Term for Evaluations
                    </label>
                  </div>
                </>
              )}

              {entityType === 'EXAM' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Category Wing *</label>
                    <select
                      value={entityData.categoryId || masterData.categories?.[0]?.id || ''}
                      onChange={(e) => setEntityData({ ...entityData, categoryId: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-madin-900"
                    >
                      {masterData.categories?.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Associated Term Period *</label>
                    <select
                      value={entityData.termId || masterData.terms?.[0]?.id || ''}
                      onChange={(e) => setEntityData({ ...entityData, termId: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-madin-900"
                    >
                      {masterData.terms?.map((t: any) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {entityType === 'LEVEL' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Code</label>
                    <input
                      type="text"
                      value={entityData.code || ''}
                      onChange={(e) => setEntityData({ ...entityData, code: e.target.value })}
                      placeholder="e.g. STATE_LEVEL"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-madin-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Weight Multiplier</label>
                    <input
                      type="number"
                      step="0.1"
                      value={entityData.weightMultiplier || 1.0}
                      onChange={(e) => setEntityData({ ...entityData, weightMultiplier: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-madin-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Display Order</label>
                    <input
                      type="number"
                      value={entityData.displayOrder || 1}
                      onChange={(e) => setEntityData({ ...entityData, displayOrder: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-madin-900"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEntityModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-madin-900 text-white rounded-xl text-xs font-semibold hover:bg-madin-950 shadow"
                >
                  {editingEntityId ? 'Save Changes' : `Add ${entityType}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {userModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-madin-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-zoom-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Create Staff / Admin Account</h3>
              </div>
              <button
                onClick={() => setUserModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="e.g. Ahmed Farooq"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-madin-900 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="e.g. staff@madin.edu.in"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-madin-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Temporary Initial Password *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Min 6 characters (e.g. Madin@2026)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-madin-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">System Role *</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-madin-900 font-semibold"
                >
                  <option value="TEACHER">Staff / Teacher</option>
                  <option value="ADMIN">Academic Admin</option>
                  <option value="CREATIVE_HUB_ADMIN">Creative Hub Admin</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                  <option value="VIEWER">Read-Only Viewer</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-[11px] text-blue-900 flex items-start space-x-2">
                <Shield className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>The new user will be required to change their password upon their very first login for security.</span>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUserModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-madin-900 text-white rounded-xl text-xs font-bold hover:bg-madin-950 shadow-md"
                >
                  Create User Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Password Change Modal */}
      {adminResetModalOpen && adminResetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-madin-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-zoom-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Change Account Password</h3>
                  <p className="text-xs text-slate-500 font-semibold">{adminResetUser.name} &bull; <span className="font-mono">{adminResetUser.email}</span></p>
                </div>
              </div>
              <button
                onClick={() => {
                  setAdminResetModalOpen(false);
                  setAdminResetUser(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdminResetPasswordSubmit} className="mt-4 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">New Secure Password *</label>
                  <button
                    type="button"
                    onClick={() => {
                      const randomPass = 'Madin@' + Math.floor(1000 + Math.random() * 9000);
                      setAdminResetPassword(randomPass);
                    }}
                    className="text-[11px] text-blue-600 hover:underline font-bold"
                  >
                    Generate Suggested
                  </button>
                </div>
                <input
                  type="text"
                  required
                  minLength={6}
                  value={adminResetPassword}
                  onChange={(e) => setAdminResetPassword(e.target.value)}
                  placeholder="Enter new password (min 6 characters)"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-madin-900"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    id="forceChangeCheck"
                    checked={adminResetForceChange}
                    onChange={(e) => setAdminResetForceChange(e.target.checked)}
                    className="w-4 h-4 rounded text-madin-900 focus:ring-madin-900"
                  />
                  <span className="text-xs text-slate-700 font-medium select-none">
                    Force user to create their own password on next login
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setAdminResetModalOpen(false);
                    setAdminResetUser(null);
                  }}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-madin-900 text-white rounded-xl text-xs font-bold hover:bg-madin-950 shadow-md transition"
                >
                  Save New Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Bulk Delete Users Confirmation Modal */}
      {confirmBulkDeleteUsersOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-scale-in">
            <div className="flex items-center space-x-3 text-rose-600 mb-4">
              <div className="p-3 bg-rose-100 rounded-full">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Confirm Bulk User Deletion</h3>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Are you sure you want to permanently delete <strong className="text-rose-600">{selectedUserIds.length}</strong> selected staff/admin user account(s)? Active login sessions will be revoked immediately.
            </p>

            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                disabled={bulkDeletingUsers}
                onClick={() => setConfirmBulkDeleteUsersOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={bulkDeletingUsers}
                onClick={handleBulkDeleteUsers}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md transition hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center space-x-1.5"
              >
                {bulkDeletingUsers ? (
                  <span>Deleting...</span>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete {selectedUserIds.length} User(s)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Bulk Delete Audit Logs Confirmation Modal */}
      {confirmBulkDeleteAuditLogsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-scale-in">
            <div className="flex items-center space-x-3 text-rose-600 mb-4">
              <div className="p-3 bg-rose-100 rounded-full">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Confirm Bulk Audit Log Deletion</h3>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Are you sure you want to permanently delete <strong className="text-rose-600">{selectedAuditLogIds.length}</strong> selected audit log entry(ies)?
            </p>

            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                disabled={bulkDeletingAuditLogs}
                onClick={() => setConfirmBulkDeleteAuditLogsOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={bulkDeletingAuditLogs}
                onClick={handleBulkDeleteAuditLogs}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md transition hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center space-x-1.5"
              >
                {bulkDeletingAuditLogs ? (
                  <span>Deleting...</span>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete {selectedAuditLogIds.length} Entry(ies)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Terms Confirmation Modal */}
      {confirmBulkDeleteTermsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-scale-in">
            <div className="flex items-center space-x-3 text-rose-600 mb-4">
              <div className="p-3 bg-rose-100 rounded-full">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Confirm Bulk Term Deletion</h3>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Are you sure you want to delete <strong className="text-rose-600">{selectedTermIds.length}</strong> selected academic term(s)? Associated exam structures and evaluations will also be affected.
            </p>

            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                disabled={bulkDeletingTerms}
                onClick={() => setConfirmBulkDeleteTermsOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={bulkDeletingTerms}
                onClick={handleBulkDeleteTerms}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md transition hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center space-x-1.5"
              >
                {bulkDeletingTerms ? (
                  <span>Deleting...</span>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete {selectedTermIds.length} Term(s)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Exams Confirmation Modal */}
      {confirmBulkDeleteExamsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-scale-in">
            <div className="flex items-center space-x-3 text-rose-600 mb-4">
              <div className="p-3 bg-rose-100 rounded-full">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Confirm Bulk Exam Deletion</h3>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Are you sure you want to delete <strong className="text-rose-600">{selectedExamIds.length}</strong> selected exam event(s)? Associated scores and performance records will be permanently removed.
            </p>

            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                disabled={bulkDeletingExams}
                onClick={() => setConfirmBulkDeleteExamsOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={bulkDeletingExams}
                onClick={handleBulkDeleteExams}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md transition hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center space-x-1.5"
              >
                {bulkDeletingExams ? (
                  <span>Deleting...</span>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete {selectedExamIds.length} Exam(s)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Schools Confirmation Modal */}
      {confirmBulkDeleteSchoolsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-scale-in">
            <div className="flex items-center space-x-3 text-rose-600 mb-4">
              <div className="p-3 bg-rose-100 rounded-full">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Confirm Bulk School Deletion</h3>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Are you sure you want to delete <strong className="text-rose-600">{selectedSchoolIds.length}</strong> selected school entity(ies)?
            </p>

            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                disabled={bulkDeletingSchools}
                onClick={() => setConfirmBulkDeleteSchoolsOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={bulkDeletingSchools}
                onClick={handleBulkDeleteSchools}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md transition hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center space-x-1.5"
              >
                {bulkDeletingSchools ? (
                  <span>Deleting...</span>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete {selectedSchoolIds.length} School(s)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Classes Confirmation Modal */}
      {confirmBulkDeleteClassesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-scale-in">
            <div className="flex items-center space-x-3 text-rose-600 mb-4">
              <div className="p-3 bg-rose-100 rounded-full">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Confirm Bulk Class Deletion</h3>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Are you sure you want to delete <strong className="text-rose-600">{selectedClassIds.length}</strong> selected class grade(s)?
            </p>

            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                disabled={bulkDeletingClasses}
                onClick={() => setConfirmBulkDeleteClassesOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={bulkDeletingClasses}
                onClick={handleBulkDeleteClasses}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md transition hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center space-x-1.5"
              >
                {bulkDeletingClasses ? (
                  <span>Deleting...</span>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete {selectedClassIds.length} Class(es)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

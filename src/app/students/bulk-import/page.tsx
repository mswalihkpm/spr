'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/layout/AdminLayout';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Download,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  RefreshCw,
  Clock,
  Check,
  FileCheck,
} from 'lucide-react';

export default function BulkImportPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importSuccessMsg, setImportSuccessMsg] = useState('');

  // Generate and download template
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Student Name': 'Muhammed Sinan K',
        Class: 'Class 10',
        School: 'GBHSS Malappuram',
        Division: 'A',
        'SPR ID (Optional)': 'SPR0118',
        'Student ID (Optional)': 'MSOE-2026-101',
      },
      {
        'Student Name': 'Ahmad Raihan P',
        Class: 'Class 9',
        School: 'CM Academy',
        Division: 'A',
        'SPR ID (Optional)': 'SPR0119',
        'Student ID (Optional)': 'MSOE-2026-102',
      },
      {
        'Student Name': 'Favas Rahman C',
        Class: 'Class +2',
        School: "Ma'din Higher Secondary School",
        Division: 'B',
        'SPR ID (Optional)': '',
        'Student ID (Optional)': '',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');

    // Auto fit columns
    worksheet['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 30 }, { wch: 10 }, { wch: 18 }, { wch: 22 }];

    XLSX.writeFile(workbook, 'SPR_Madin_Student_Import_Template.xlsx');
  };

  // Handle file drop / upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setValidationResult(null);
    setImportSuccessMsg('');

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData: any[] = XLSX.utils.sheet_to_json(ws);

        // Normalize keys
        const rows = rawData.map((r: any) => ({
          studentName: r['Student Name'] || r['Name'] || r['studentName'] || r['Student'] || '',
          class: r['Class'] || r['class'] || r['Grade'] || '',
          school: r['School'] || r['school'] || r['Institution'] || '',
          division: r['Division'] || r['division'] || r['Batch'] || 'A',
          sprStudentId: r['SPR ID (Optional)'] || r['SPR ID'] || r['SPR Student ID'] || r['sprStudentId'] || r['sprId'] || '',
          studentId: r['Student ID (Optional)'] || r['Student ID'] || r['studentId'] || r['ID'] || '',
        }));

        setParsedRows(rows);
        validateDataset(rows, uploadedFile.name);
      } catch (err) {
        alert('Failed to read Excel file. Please ensure it is a valid .xlsx or .csv file.');
      }
    };
    reader.readAsBinaryString(uploadedFile);
  };

  // Trigger server-side validation
  const validateDataset = async (rows: any[], fileName: string) => {
    setValidating(true);
    try {
      const res = await fetch('/api/students/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'VALIDATE',
          rows,
          fileName,
        }),
      });
      const data = await res.json();
      setValidationResult(data);
    } catch (err) {
      console.error('Validation error:', err);
    } finally {
      setValidating(false);
    }
  };

  // Final confirmed import
  const handleConfirmImport = async () => {
    if (!validationResult || !validationResult.canImport) return;

    setImporting(true);
    try {
      const res = await fetch('/api/students/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CONFIRM_IMPORT',
          rows: parsedRows,
          fileName: file?.name,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed.');

      setImportSuccessMsg(data.message);
      setParsedRows([]);
      setFile(null);
      setValidationResult(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-subtle">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <span>Bulk Student Excel Import</span>
            </h2>
            <p className="text-xs text-slate-500">
              Upload class cohorts via Microsoft Excel (.xlsx) with automated integrity checks.
            </p>
          </div>

          <button
            onClick={handleDownloadTemplate}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center space-x-2 transition-colors border border-slate-200"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Download Official Excel Template</span>
          </button>
        </div>

        {/* Success Alert */}
        {importSuccessMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between animate-fade-in">
            <div className="flex items-center space-x-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="font-semibold">{importSuccessMsg}</span>
            </div>
            <button
              onClick={() => router.push('/students')}
              className="px-3 py-1 bg-emerald-600 text-white rounded-lg font-bold text-xs hover:bg-emerald-700"
            >
              View Students Directory
            </button>
          </div>
        )}

        {/* Upload Box */}
        <div className="bg-white p-8 rounded-2xl border-2 border-dashed border-slate-200 hover:border-madin-700 transition-colors text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <UploadCloud className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Select or Drag Excel Spreadsheet</h3>
            <p className="text-xs text-slate-400 mt-0.5">Supports .xlsx and .csv files formatted with required columns</p>
          </div>

          <div className="pt-2">
            <label className="cursor-pointer inline-flex items-center px-4 py-2 rounded-xl bg-madin-900 hover:bg-madin-950 text-white text-xs font-semibold transition-all shadow">
              <span>Choose Excel File</span>
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {file && (
            <div className="text-xs font-medium text-slate-600 pt-2 flex items-center justify-center space-x-1">
              <FileCheck className="w-4 h-4 text-emerald-600" />
              <span>{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
            </div>
          )}
        </div>

        {/* Validation Progress */}
        {validating && (
          <div className="p-6 bg-white rounded-2xl border border-slate-200 text-center space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin text-madin-700 mx-auto" />
            <div className="text-xs font-semibold text-slate-700">Validating student rows against database records...</div>
          </div>
        )}

        {/* Validation Summary Report */}
        {validationResult && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Pre-Import Validation Report</h3>
              <div className="flex items-center space-x-3 text-xs">
                <span className="flex items-center text-slate-600">
                  Total Rows: <strong>{validationResult.totalRows}</strong>
                </span>
                <span className="flex items-center text-emerald-600">
                  <Check className="w-3.5 h-3.5 mr-1" /> Valid: <strong>{validationResult.validRows}</strong>
                </span>
                {validationResult.errorRows > 0 && (
                  <span className="flex items-center text-rose-600">
                    <XCircle className="w-3.5 h-3.5 mr-1" /> Issues: <strong>{validationResult.errorRows}</strong>
                  </span>
                )}
              </div>
            </div>

            {/* If errors found */}
            {validationResult.issues && validationResult.issues.length > 0 ? (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <div>
                    <strong>Validation Blocked:</strong> Found {validationResult.issues.length} errors in your file. Please correct the invalid rows and re-upload.
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">Excel Row #</th>
                        <th className="py-2.5 px-3">Field</th>
                        <th className="py-2.5 px-3">Provided Value</th>
                        <th className="py-2.5 px-3">Error Diagnosis</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {validationResult.issues.map((iss: any, idx: number) => (
                        <tr key={idx} className="hover:bg-rose-50/50">
                          <td className="py-2 px-3 font-bold text-rose-700">Row {iss.rowNumber}</td>
                          <td className="py-2 px-3 text-slate-700">{iss.field}</td>
                          <td className="py-2 px-3 text-slate-900 bg-slate-50 rounded">
                            {iss.value || '«EMPTY»'}
                          </td>
                          <td className="py-2 px-3 font-sans text-rose-600 font-medium">{iss.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* If completely valid */
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>All {validationResult.validRows} records validated successfully!</strong> Ready for database insertion.
                  </span>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-2">
                  <button
                    onClick={() => {
                      setValidationResult(null);
                      setFile(null);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmImport}
                    disabled={importing}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-lg transition-all flex items-center space-x-2 disabled:opacity-50"
                  >
                    {importing ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Confirm & Ingest {validationResult.validRows} Students</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

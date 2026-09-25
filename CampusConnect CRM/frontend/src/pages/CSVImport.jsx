import React, { useState } from 'react';
import MainLayout from '../layouts/MainLayout';
import { 
  FileUp, 
  CheckCircle2, 
  AlertCircle, 
  FileSpreadsheet,
  Trash2,
  Table as TableIcon
} from 'lucide-react';
import Papa from 'papaparse';
import api from '../services/api';
import toast from 'react-hot-toast';

const CSVImport = () => {
  const [data, setData] = useState([]);
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFile(file);
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setData(results.data);
          toast.success(`${results.data.length} rows parsed!`);
        }
      });
    }
  };

  const handleImport = async () => {
    if (data.length === 0) return;
    setImporting(true);
    try {
      // Map CSV headers to database fields
      const formattedLeads = data.map(item => ({
        full_name: item.name || item.fullName || item['Full Name'],
        phone: item.phone || item['Phone Number'],
        email: item.email || item['Email Address'],
        course_interested: item.course || item['Course Interested'],
        city: item.city,
        state: item.state,
        source: item.source || 'CSV_IMPORT'
      }));

      const response = await api.post('/leads/import', { leads: formattedLeads });
      setResult(response.data);
      toast.success('Import completed!');
    } catch (error) {
      toast.error('Import failed');
    } finally {
      setImporting(false);
    }
  };

  const clearData = () => {
    setData([]);
    setFile(null);
    setResult(null);
  };

  return (
    <MainLayout title="Bulk Lead Import">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Upload Area */}
        {!data.length ? (
          <div className="bg-white rounded-[2.5rem] border-2 border-dashed border-secondary/10 p-16 text-center">
            <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mx-auto mb-6">
              <FileUp size={40} />
            </div>
            <h2 className="text-xl font-black text-secondary-900 mb-2">Upload your CSV file</h2>
            <p className="text-sm font-bold text-secondary/40 mb-8 max-w-xs mx-auto">
              Import hundreds of leads instantly. Make sure your CSV has columns like Name, Phone, and Email.
            </p>
            <label className="inline-block px-10 py-4 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest cursor-pointer hover:scale-105 transition-transform shadow-lg shadow-primary/20">
              Browse Files
              <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Action Bar */}
            <div className="flex items-center justify-between bg-white rounded-3xl p-6 border border-secondary/5 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-success/10 rounded-2xl flex items-center justify-center text-success">
                  <FileSpreadsheet size={24} />
                </div>
                <div>
                  <p className="text-sm font-black text-secondary-900">{file?.name}</p>
                  <p className="text-[10px] font-black text-secondary/40 uppercase tracking-widest">{data.length} Leads found</p>
                </div>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={clearData}
                  className="px-6 py-3 bg-secondary/5 text-secondary-900 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-secondary/10"
                >
                  <Trash2 size={16} /> Reset
                </button>
                {!result && (
                  <button 
                    onClick={handleImport}
                    disabled={importing}
                    className="px-10 py-3 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 disabled:opacity-50"
                  >
                    {importing ? 'Importing...' : 'Start Import'}
                  </button>
                )}
              </div>
            </div>

            {/* Results Alert */}
            {result && (
              <div className="bg-success/5 border border-success/20 rounded-3xl p-8 flex items-center gap-6">
                <div className="w-16 h-16 bg-success/10 rounded-2xl flex items-center justify-center text-success">
                  <CheckCircle2 size={32} />
                </div>
                <div className="flex-1 grid grid-cols-2 gap-8">
                  <div>
                    <p className="text-2xl font-black text-success">{result.imported}</p>
                    <p className="text-[10px] font-black text-secondary/40 uppercase tracking-widest">Leads Successfully Imported</p>
                  </div>
                  <div>
                    <p className="text-2xl font-black text-secondary/60">{result.skipped}</p>
                    <p className="text-[10px] font-black text-secondary/40 uppercase tracking-widest">Duplicates Skipped</p>
                  </div>
                </div>
              </div>
            )}

            {/* Preview Table */}
            <div className="bg-white rounded-[2.5rem] border border-secondary/10 overflow-hidden shadow-sm">
              <div className="p-6 border-b border-secondary/5 flex items-center gap-2 font-black text-sm text-secondary-900">
                <TableIcon size={18} className="text-primary" /> Data Preview
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-secondary/5 text-[10px] font-black text-secondary/40 uppercase tracking-widest">
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4">Phone</th>
                      <th className="px-6 py-4">Email</th>
                      <th className="px-6 py-4">Course</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary/5">
                    {data.slice(0, 10).map((row, i) => (
                      <tr key={i} className="hover:bg-secondary/5 transition-colors">
                        <td className="px-6 py-4 text-xs font-bold text-secondary-900">{row.name || row.fullName || row['Full Name']}</td>
                        <td className="px-6 py-4 text-xs font-bold text-secondary/60">{row.phone || row['Phone Number']}</td>
                        <td className="px-6 py-4 text-xs font-bold text-secondary/60">{row.email || row['Email Address']}</td>
                        <td className="px-6 py-4 text-[10px] font-black text-primary uppercase tracking-widest">{row.course || row['Course Interested']}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {data.length > 10 && (
                <div className="p-4 bg-secondary/5 text-center text-[10px] font-black text-secondary/40 uppercase tracking-widest">
                  Showing first 10 leads of {data.length} total rows
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </MainLayout>
  );
};

export default CSVImport;

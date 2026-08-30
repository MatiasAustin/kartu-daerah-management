"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Key, Globe, Search, ShieldAlert, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface ApiKey {
  id: string;
  provider: string;
  api_key: string;
  description: string;
  allowed_origins: string[] | null;
  status: string;
  created_at: string;
}

export function ApiKeysClient() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const supabase = createClient();

  const [newProvider, setNewProvider] = useState("maptiler");
  const [newKey, setNewKey] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newOrigins, setNewOrigins] = useState("");

  const loadKeys = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
      
    if (data) setKeys(data);
    setLoading(false);
  };

  useEffect(() => {
    loadKeys();
  }, []);

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const originsArray = newOrigins.split('\n').map(o => o.trim()).filter(o => o);

    const { error } = await supabase.from('api_keys').insert({
      user_id: user.id,
      provider: newProvider,
      api_key: newKey,
      description: newDesc,
      allowed_origins: originsArray.length > 0 ? originsArray : null
    });

    if (!error) {
      setIsAdding(false);
      setNewKey("");
      setNewDesc("");
      setNewOrigins("");
      loadKeys();
    } else {
      alert("Error adding key");
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this key?")) return;
    
    const { error } = await supabase.from('api_keys').delete().eq('id', id);
    if (!error) {
      loadKeys();
    }
  };

  const maskKey = (key: string) => {
    if (key.length <= 8) return "********";
    return "************" + key.slice(-4);
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading API Keys...</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">API Keys</h3>
          <p className="text-sm text-slate-500">Manage map provider keys.</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 transition"
        >
          <Plus className="w-4 h-4" /> New Key
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAddKey} className="bg-slate-50 p-6 rounded-lg border border-slate-200 space-y-4">
          <h4 className="font-medium text-slate-900">Add New API Key</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Provider</label>
              <select 
                value={newProvider} 
                onChange={e => setNewProvider(e.target.value)}
                className="w-full border-slate-300 rounded-md shadow-sm sm:text-sm p-2 border"
              >
                <option value="maptiler">MapTiler</option>
                <option value="existing">Existing / Other</option>
              </select>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">API Key</label>
              <input 
                type="text" 
                required
                value={newKey}
                onChange={e => setNewKey(e.target.value)}
                className="w-full border-slate-300 rounded-md shadow-sm sm:text-sm p-2 border"
                placeholder="Paste API Key here..."
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Description</label>
            <input 
              type="text"
              required
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              className="w-full border-slate-300 rounded-md shadow-sm sm:text-sm p-2 border"
              placeholder="e.g. Kartu Daerah Management"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Allowed HTTP Origins (One per line)</label>
            <textarea 
              value={newOrigins}
              onChange={e => setNewOrigins(e.target.value)}
              className="w-full border-slate-300 rounded-md shadow-sm sm:text-sm p-2 border min-h-[80px]"
              placeholder={"https://example.com\nhttp://localhost:3000"}
            />
            <p className="text-xs text-slate-500">Leave blank to allow all origins.</p>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button 
              type="button" 
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
            >
              Save Key
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Provider</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Key</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Description</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
              <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {keys.map((k) => (
              <tr key={k.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 capitalize">{k.provider}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-600">{maskKey(k.api_key)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                  {k.description}
                  <div className="text-xs text-slate-400 mt-1">Created {new Date(k.created_at).toLocaleDateString()}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${k.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                    {k.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button onClick={() => handleRevoke(k.id)} className="text-red-600 hover:text-red-900 px-3 py-1 bg-red-50 rounded-md">
                    Revoke
                  </button>
                </td>
              </tr>
            ))}
            {keys.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500 text-sm">
                  No API keys found. Click "New Key" to add one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import React, { useRef, useState, useEffect } from 'react';
import api from '../lib/api';

const AIFileStudio = () => {
  const [files, setFiles] = useState([]);
  const [selected, setSelected] = useState(null);
  const [ai, setAi] = useState(null);
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState('');
  const fileInput = useRef();

  useEffect(() => {
    api.get('/upload').then(res => setFiles(res.data.files));
  }, []);

  const handleUpload = async (e) => {
    setLoading(true);
    const formData = new FormData();
    formData.append('file', e.target.files[0]);
    const res = await api.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    setFiles(f => [res.data.file, ...f]);
    setSelected(res.data.file);
    setLoading(false);
    // Auto-run AI
    setAi(null);
    setTimeout(() => handleAI(res.data.file.text), 100);
  };

  const handleAI = async (text) => {
    setLoading(true);
    const res = await api.post('/ai/process', { text });
    setAi(res.data);
    setLoading(false);
  };

  const handleRemove = async (filename) => {
    setRemoving(filename);
    if (!window.confirm('Do you want to remove the file?')) {
      setRemoving('');
      return;
    }
    await api.delete(`/upload/${filename}`);
    setFiles(f => f.filter(file => file.filename !== filename));
    if (selected && selected.filename === filename) {
      setSelected(null);
      setAi(null);
    }
    setRemoving('');
  };

  return (
    <div className="max-w-4xl mx-auto bg-gray-900 rounded-lg p-6 mt-8 flex gap-8">
      <div className="w-1/3">
        <h2 className="font-bold mb-4 text-lg">Uploaded Files</h2>
        <input
          type="file"
          accept=".pdf,.txt,.doc,.docx,.ppt,.pptx"
          ref={fileInput}
          onChange={handleUpload}
          className="mb-4 block"
          disabled={loading}
        />
        <ul>
          {files.map(file => (
            <li
              key={file.filename}
              className={`flex items-center justify-between mb-2 p-2 rounded cursor-pointer ${selected && selected.filename === file.filename ? 'bg-yellow-400 text-black' : 'bg-gray-800 text-white'}`}
              onClick={() => { setSelected(file); setAi(null); handleAI(file.text); }}
            >
              <span>{file.name}</span>
              <button
                className="ml-2 text-red-400"
                onClick={e => { e.stopPropagation(); handleRemove(file.filename); }}
                disabled={removing === file.filename}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex-1">
        <h2 className="font-bold mb-4 text-lg">AI Studio</h2>
        {loading && <div className="mb-4">Processing...</div>}
        {selected && ai && (
          <div>
            <div className="mb-4">
              <h3 className="font-semibold">Study Plan</h3>
              <ul className="list-disc ml-6">
                {ai.studyPlan.map((d, i) => (
                  <li key={i}><b>Day {d.day}:</b> {Array.isArray(d.topics) ? d.topics.join(', ') : d.topics}</li>
                ))}
              </ul>
            </div>
            <div className="mb-4">
              <h3 className="font-semibold">Summary</h3>
              <div className="bg-gray-800 rounded p-2">{ai.summary}</div>
            </div>
            <div className="mb-4">
              <h3 className="font-semibold">Notes</h3>
              <ul className="list-disc ml-6">
                {ai.notes.split('\n').map((line, i) =>
                  line.trim() ? <li key={i}>{line.replace(/^[-•]\s?/, '')}</li> : null
                )}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold">Quiz</h3>
              {Array.isArray(ai.quiz) && ai.quiz.map((q, i) => (
                <div key={i} className="mb-4">
                  <div className="font-bold">{i + 1}. {q.question}</div>
                  <ul className="ml-6">
                    {q.options.map((opt, j) => (
                      <li key={j}>{String.fromCharCode(65 + j)}. {opt}</li>
                    ))}
                  </ul>
                  <div className="text-green-400 text-sm mt-1">Answer: {q.correctAnswer}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {!selected && <div className="text-gray-400">Select or upload a file to see study plan, summary, notes, and quiz.</div>}
      </div>
    </div>
  );
};

export default AIFileStudio;

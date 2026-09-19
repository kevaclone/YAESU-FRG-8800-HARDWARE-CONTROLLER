/**
 * Memory Channel Manager for Yaesu FRG-8800
 * Manages 12 physical hardware memory channels (M01-M12) and unlimited computerized channels,
 * with search, filtering, export/import, and instant recall.
 */

import React, { useState } from 'react';
import { MemoryChannel, RadioMode } from '../types';
import { formatFrequency } from '../services/catProtocol';
import { Bookmark, Plus, Download, Upload, Trash2, Search, Check, Radio } from 'lucide-react';
import { audioSynth } from '../services/audioSynth';

interface MemoryManagerProps {
  memories: MemoryChannel[];
  activeChannelId?: string | null;
  currentFrequencyHz: number;
  currentMode: RadioMode;
  onRecallMemory: (channel: MemoryChannel) => void;
  onSaveToMemory: (channel: Omit<MemoryChannel, 'id'>) => void;
  onDeleteMemory: (id: string) => void;
  onImportMemories: (channels: MemoryChannel[]) => void;
  disabled?: boolean;
}

export const MemoryManager: React.FC<MemoryManagerProps> = ({
  memories,
  activeChannelId,
  currentFrequencyHz,
  currentMode,
  onRecallMemory,
  onSaveToMemory,
  onDeleteMemory,
  onImportMemories,
  disabled = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('All');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newChannelNumber, setNewChannelNumber] = useState(1);
  const [newName, setNewName] = useState('');
  const [newTag, setNewTag] = useState('Amateur');
  const [newNotes, setNewNotes] = useState('');

  const tags = ['All', 'Amateur', 'SW Broadcast', 'Time/Freq', 'Aviation', 'Marine', 'Utility'];

  const filteredMemories = memories.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.notes && m.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
      m.frequencyHz.toString().includes(searchQuery);
    const matchesTag = selectedTag === 'All' || m.tag === selectedTag;
    return matchesSearch && matchesTag;
  });

  const handleOpenAdd = () => {
    const nextNum = Math.max(0, ...memories.map((m) => m.channelNumber)) + 1;
    setNewChannelNumber(nextNum <= 12 ? nextNum : nextNum);
    setNewName(`Channel ${nextNum}`);
    setNewNotes('');
    setIsAddingNew(true);
    audioSynth.playKeyBeep(1400, 0.02);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    onSaveToMemory({
      channelNumber: Number(newChannelNumber),
      name: newName.trim(),
      frequencyHz: currentFrequencyHz,
      mode: currentMode,
      tag: newTag,
      notes: newNotes.trim(),
      isHardwareSlot: newChannelNumber <= 12,
    });

    setIsAddingNew(false);
    audioSynth.playRelayClick();
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(memories, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `yaesu_frg8800_memories_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    audioSynth.playKeyBeep(1800, 0.03);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed) && parsed.length > 0) {
          onImportMemories(parsed);
          audioSynth.playRelayClick();
        }
      } catch (err) {
        console.error('Failed to parse memory JSON file:', err);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      id="memory-manager-panel"
      className="p-4 sm:p-5 bg-zinc-900/90 rounded-2xl border border-zinc-800 shadow-xl"
    >
      {/* Header and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Bookmark className="w-5 h-5 text-emerald-400" />
          <h2 className="text-sm font-bold tracking-wider text-zinc-100 uppercase">
            MEMORY CHANNELS (HARDWARE M01–M12 & COMPUTER BANKS)
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            id="btn-add-memory"
            onClick={handleOpenAdd}
            disabled={disabled}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-40 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Store Current VFO</span>
          </button>

          <button
            type="button"
            id="btn-export-memories"
            onClick={handleExportJson}
            title="Export memories to JSON file"
            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>

          <label
            htmlFor="import-memories-input"
            title="Import memories from JSON file"
            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Import</span>
            <input
              id="import-memories-input"
              type="file"
              accept=".json"
              onChange={handleImportJson}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search channels, notes, frequencies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Tag Filters */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              id={`mem-filter-${tag.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
              onClick={() => setSelectedTag(tag)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                selectedTag === tag
                  ? 'bg-emerald-600 text-white'
                  : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Store Current VFO Dialog Modal */}
      {isAddingNew && (
        <form
          onSubmit={handleSave}
          className="mb-4 p-4 rounded-xl bg-zinc-950 border border-emerald-500/50 shadow-lg"
        >
          <div className="text-xs font-bold text-emerald-400 uppercase mb-3 flex items-center gap-1.5">
            <Bookmark className="w-4 h-4" />
            <span>Store Current Frequency ({formatFrequency(currentFrequencyHz)}) to Memory</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="text-[10px] uppercase font-semibold text-zinc-400 block mb-1">
                Channel Number (1-12 = FRG-8800 EEPROM)
              </label>
              <input
                type="number"
                min="1"
                max="999"
                value={newChannelNumber}
                onChange={(e) => setNewChannelNumber(parseInt(e.target.value, 10) || 1)}
                className="w-full p-2 rounded bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs font-mono font-bold"
                required
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-semibold text-zinc-400 block mb-1">
                Channel Label Name
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. 20m Calling Net"
                className="w-full p-2 rounded bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs"
                required
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-semibold text-zinc-400 block mb-1">
                Category Tag
              </label>
              <select
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                className="w-full p-2 rounded bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs"
              >
                {tags.filter((t) => t !== 'All').map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-3">
            <label className="text-[10px] uppercase font-semibold text-zinc-400 block mb-1">
              Notes & Operating Details
            </label>
            <input
              type="text"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="e.g. Daily schedule, antenna direction, net control..."
              className="w-full p-2 rounded bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddingNew(false)}
              className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              Save Memory
            </button>
          </div>
        </form>
      )}

      {/* Memory Channels List */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
        {filteredMemories.map((channel) => {
          const isActive = activeChannelId === channel.id;

          return (
            <div
              key={channel.id}
              className={`p-3 rounded-xl border text-left flex items-start justify-between gap-2 transition-all ${
                isActive
                  ? 'bg-zinc-800/95 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.25)] ring-1 ring-emerald-500/50'
                  : 'bg-zinc-950/70 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/60'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                      channel.isHardwareSlot
                        ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                        : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                    }`}
                  >
                    CH-{channel.channelNumber.toString().padStart(2, '0')}
                    {channel.isHardwareSlot ? ' (HW)' : ''}
                  </span>

                  <span className="font-bold text-xs text-zinc-200 truncate">
                    {channel.name}
                  </span>
                </div>

                <div className="flex items-baseline gap-2 mb-1 font-mono">
                  <span className="text-sm font-bold text-emerald-400">
                    {formatFrequency(channel.frequencyHz)}
                  </span>
                  <span className="text-[10px] px-1 py-0.2 rounded bg-zinc-800 text-emerald-300 border border-zinc-700">
                    {channel.mode}
                  </span>
                  {channel.tag && (
                    <span className="text-[9px] text-zinc-400 bg-zinc-900 px-1 py-0.2 rounded">
                      {channel.tag}
                    </span>
                  )}
                </div>

                {channel.notes && (
                  <p className="text-[11px] text-zinc-500 truncate leading-tight">
                    {channel.notes}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-1 items-end">
                <button
                  type="button"
                  id={`btn-recall-${channel.id}`}
                  onClick={() => {
                    if (!disabled) {
                      audioSynth.playKeyBeep(1800, 0.04);
                      onRecallMemory(channel);
                    }
                  }}
                  disabled={disabled}
                  title="Recall and Tune Radio"
                  className="px-2.5 py-1 rounded bg-emerald-600/90 hover:bg-emerald-500 active:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer transition-colors disabled:opacity-40 flex items-center gap-1"
                >
                  <Radio className="w-3 h-3" />
                  <span>TUNE</span>
                </button>

                <button
                  type="button"
                  id={`btn-delete-${channel.id}`}
                  onClick={() => {
                    audioSynth.playKeyBeep(700, 0.03);
                    onDeleteMemory(channel.id);
                  }}
                  title="Delete memory channel"
                  className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        {filteredMemories.length === 0 && (
          <div className="col-span-full p-8 text-center text-zinc-500 text-xs">
            No memory channels found matching your criteria.
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Lock, Unlock, LogOut, Delete, ShieldAlert } from 'lucide-react';
import { UserSession } from '../../../shared/types';

interface LockScreenModalProps {
  isOpen: boolean;
  user: UserSession | null;
  storeName: string;
  onUnlock: (pinOrPassword: string) => Promise<boolean>;
  onSwitchUser: () => void;
}

export const LockScreenModal: React.FC<LockScreenModalProps> = ({
  isOpen,
  user,
  storeName,
  onUnlock,
  onSwitchUser,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !user) return null;

  const handleUnlock = async (codeToTest?: string) => {
    const val = codeToTest !== undefined ? codeToTest : pinInput;
    if (!val) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const ok = await onUnlock(val);
      if (ok) {
        setPinInput('');
        setErrorMsg('');
      } else {
        setErrorMsg('Incorrect PIN code or password.');
        setPinInput('');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Unlock failed.');
      setPinInput('');
    } finally {
      setLoading(false);
    }
  };

  const handleKeypadPress = (digit: string) => {
    setErrorMsg('');
    if (pinInput.length < 12) {
      const next = pinInput + digit;
      setPinInput(next);
      if (next.length === 4) {
        handleUnlock(next);
      }
    }
  };

  const handleBackspace = () => {
    setPinInput((prev) => prev.slice(0, -1));
    setErrorMsg('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleUnlock();
    }
  };

  const keypadButtons = [
    { num: '1', letters: '' },
    { num: '2', letters: 'ABC' },
    { num: '3', letters: 'DEF' },
    { num: '4', letters: 'GHI' },
    { num: '5', letters: 'JKL' },
    { num: '6', letters: 'MNO' },
    { num: '7', letters: 'PQRS' },
    { num: '8', letters: 'TUV' },
    { num: '9', letters: 'WXYZ' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-[#090a10]/95 backdrop-blur-2xl flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-sm flex flex-col items-center text-center">
        {/* Brand Badge */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 border border-white/20 p-3 shadow-2xl shadow-blue-500/30 mb-3 flex items-center justify-center text-white font-black text-2xl">
          HA
        </div>

        <h2 className="text-xl font-black text-white tracking-tight">{storeName || 'Harsh Apex POS'}</h2>
        <div className="flex items-center gap-1.5 text-xs text-rose-400 font-bold mt-1">
          <Lock className="w-3.5 h-3.5 text-rose-500" />
          <span>Screen Locked for Security</span>
        </div>

        {/* User Card */}
        <div className="mt-5 flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md shadow-lg">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-extrabold text-sm shadow-md">
            {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="text-left">
            <div className="text-sm font-bold text-white">{user.fullName || user.username}</div>
            <div className="text-[11px] text-white/70 capitalize font-medium">{user.role} • @{user.username}</div>
          </div>
        </div>

        {/* PIN Display Dots & Input */}
        <div className="mt-6 w-full max-w-[280px]">
          <div className="flex justify-center items-center gap-3 mb-3">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                  pinInput.length > idx
                    ? 'bg-blue-500 scale-125 border-2 border-white shadow-[0_0_12px_rgba(59,130,246,0.8)]'
                    : 'bg-white/10 border-2 border-white/30'
                }`}
              />
            ))}
          </div>

          <div className="relative">
            <input
              type="password"
              placeholder="Enter PIN (e.g. 2003)..."
              value={pinInput}
              onChange={(e) => {
                setPinInput(e.target.value);
                setErrorMsg('');
              }}
              onKeyDown={handleKeyDown}
              autoFocus
              className="w-full py-2.5 px-4 text-center rounded-xl bg-white/10 border border-white/20 text-white text-base tracking-widest placeholder:tracking-normal placeholder:text-white/40 focus:outline-none focus:border-blue-500 font-mono font-bold"
            />
          </div>

          {errorMsg && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-rose-400 mt-2 font-bold bg-rose-500/10 py-1.5 px-3 rounded-lg border border-rose-500/20">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3 mt-5 w-full max-w-[270px]">
          {keypadButtons.map((btn) => (
            <button
              key={btn.num}
              type="button"
              onClick={() => handleKeypadPress(btn.num)}
              className="h-14 rounded-2xl bg-white/10 hover:bg-white/20 active:bg-white/30 active:scale-95 border border-white/15 text-white transition-all flex flex-col items-center justify-center shadow-sm"
            >
              <span className="font-sans text-2xl font-bold text-white leading-none">
                {btn.num}
              </span>
              {btn.letters && (
                <span className="text-[8.5px] font-bold text-white/60 tracking-widest leading-none mt-0.5">
                  {btn.letters}
                </span>
              )}
            </button>
          ))}

          {/* Backspace Button */}
          <button
            type="button"
            onClick={handleBackspace}
            title="Delete"
            className="h-14 rounded-2xl bg-white/5 hover:bg-white/15 active:scale-95 border border-white/10 text-white/70 hover:text-white transition-all flex items-center justify-center"
          >
            <Delete className="w-5 h-5" />
          </button>

          {/* Zero Button */}
          <button
            type="button"
            onClick={() => handleKeypadPress('0')}
            className="h-14 rounded-2xl bg-white/10 hover:bg-white/20 active:bg-white/30 active:scale-95 border border-white/15 text-white transition-all flex flex-col items-center justify-center shadow-sm"
          >
            <span className="font-sans text-2xl font-bold text-white leading-none">
              0
            </span>
          </button>

          {/* Unlock Submit Button */}
          <button
            type="button"
            onClick={() => handleUnlock()}
            disabled={loading}
            title="Unlock Screen"
            className="h-14 rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white transition-all flex items-center justify-center shadow-lg shadow-blue-600/40"
          >
            <Unlock className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Switch User / Hint row */}
        <div className="mt-6 flex items-center justify-between w-full max-w-[270px] text-xs">
          <button
            onClick={onSwitchUser}
            className="flex items-center gap-1.5 text-white/70 hover:text-rose-400 font-medium transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Switch User</span>
          </button>

          <span className="text-[11px] text-white/70 font-mono bg-white/10 px-2.5 py-1 rounded-full border border-white/15 font-semibold">
            PIN: 2003
          </span>
        </div>
      </div>
    </div>
  );
};

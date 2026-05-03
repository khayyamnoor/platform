export interface UsageRecord {
  id: string;
  timestamp: number;
  type: 'image' | 'video' | 'text';
  model: string;
  tokensUsed: number;
  cost: number;
  details: string;
}

const STORAGE_KEY = 'lollys_api_usage_history';
const BALANCE_KEY = 'lollys_api_balance';

export const getBalance = (): number => {
  try {
    const data = localStorage.getItem(BALANCE_KEY);
    return data ? parseFloat(data) : 100.00; // Default $100 starting balance
  } catch (e) {
    return 100.00;
  }
};

export const setBalance = (amount: number) => {
  localStorage.setItem(BALANCE_KEY, amount.toString());
  window.dispatchEvent(new CustomEvent('balance-updated', { detail: amount }));
};

export const deductBalance = (amount: number) => {
  const current = getBalance();
  setBalance(current - amount);
};

export const getUsageHistory = (): UsageRecord[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to load usage history', e);
    return [];
  }
};

export const addUsageRecord = (record: Omit<UsageRecord, 'id' | 'timestamp'>) => {
  try {
    const history = getUsageHistory();
    const newRecord: UsageRecord = {
      ...record,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    history.unshift(newRecord);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    
    deductBalance(record.cost);
    
    // Dispatch a custom event so the dashboard can update in real-time
    window.dispatchEvent(new CustomEvent('usage-updated', { detail: newRecord }));
  } catch (e) {
    console.error('Failed to save usage record', e);
  }
};

export const clearUsageHistory = () => {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent('usage-updated'));
};

export const calculateTotalCost = (history: UsageRecord[]) => {
  return history.reduce((total, record) => total + record.cost, 0);
};

export const calculateTotalTokens = (history: UsageRecord[]) => {
  return history.reduce((total, record) => total + record.tokensUsed, 0);
};

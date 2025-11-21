import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import {
  ClipboardIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  CurrencyDollarIcon,
  ArrowLeftIcon,
  ArrowUpIcon,
  ArrowsRightLeftIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  HomeIcon,
  Cog6ToothIcon,
  WalletIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline'
import { XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid } from 'recharts'
import { walletService } from './services/wallet'
import { priceService, type CryptoPrices, type PricePoint } from './services/price'
import logo from './assets/logo.png'

// Sepolia USDC Address
const SEPOLIA_USDC_ADDRESS = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';

// Toast Component
interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

const Toast = ({ message, type, onClose }: ToastProps) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColors = {
    success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    error: 'bg-red-500/10 border-red-500/20 text-red-400',
    info: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
  };

  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border backdrop-blur-md shadow-xl ${bgColors[type]} animate-in fade-in slide-in-from-top-2 duration-300`}>
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
        <XMarkIcon className="w-4 h-4" />
      </button>
    </div>
  );
};

function App() {
  const [walletAddress, setWalletAddress] = useState('')
  const [balance, setBalance] = useState<{ eth: string; usd: string; usdc: string }>({ eth: '0.000000', usd: '0.00', usdc: '0.00' })
  const [gasPrice, setGasPrice] = useState('N/A')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [currentView, setCurrentView] = useState<'onboarding' | 'create' | 'import' | 'main' | 'send' | 'receive' | 'asset-details'>('onboarding')
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
  const [sendAmount, setSendAmount] = useState('')
  const [sendAddress, setSendAddress] = useState('')
  const [sending, setSending] = useState(false)
  const [cryptoPrices, setCryptoPrices] = useState<CryptoPrices>({ ETH: 0, BTC: 0, USDC: 0 })
  const [portfolioValue, setPortfolioValue] = useState<number>(0)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [mnemonic, setMnemonic] = useState<string>('')
  const [importPhrase, setImportPhrase] = useState('')
  const [selectedToken, setSelectedToken] = useState<'ETH' | 'USDC'>('ETH')

  // Security State
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [unlockPassword, setUnlockPassword] = useState('')
  const [isLocked, setIsLocked] = useState(false)
  const [showPasswordCreate, setShowPasswordCreate] = useState(false)

  // Chart State
  const [selectedAsset, setSelectedAsset] = useState<'ETH' | 'BTC' | 'USDC' | null>(null)
  const [historicalData, setHistoricalData] = useState<PricePoint[]>([])
  const [chartLoading, setChartLoading] = useState(false)
  const [timeframe, setTimeframe] = useState<'1D' | '1W' | '1M'>('1D');

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type })
  }

  const handleTimeframeChange = async (tf: '1D' | '1W' | '1M') => {
    if (!selectedAsset) return;
    setTimeframe(tf);
    setChartLoading(true);
    try {
      const history = await priceService.getHistoricalPrices(selectedAsset, tf);
      setHistoricalData(history);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setChartLoading(false);
    }
  };

  useEffect(() => {
    initializeApp()
  }, [])

  useEffect(() => {
    if (currentView === 'receive' && !qrCodeUrl) {
      generateQRCode()
    }
  }, [currentView, qrCodeUrl])

  // Poll for live price updates when in asset details view
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (currentView === 'asset-details' && selectedAsset) {
      interval = setInterval(async () => {
        const prices = await priceService.getCurrentPrices();
        setCryptoPrices(prices);
        // Ideally we would append this to historicalData too for "live" chart feel
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [currentView, selectedAsset]);

  const initializeApp = async () => {
    setLoading(true)

    try {
      const prices = await priceService.getCurrentPrices()
      setCryptoPrices(prices)

      const hasWallet = await walletService.hasWallet()

      if (hasWallet) {
        setIsLocked(true)
        setCurrentView('main') // Will show unlock screen overlay
      } else {
        setCurrentView('onboarding')
      }
    } catch (error) {
      console.error('App initialization error:', error)
      showToast('Failed to initialize wallet', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleUnlock = async () => {
    setLoading(true)
    try {
      const result = await walletService.unlockWalletWithPassword(unlockPassword)
      if (result.success && result.data) {
        setWalletAddress(result.data.address)
        await loadWalletData(result.data.address)
        setIsLocked(false)
        setUnlockPassword('')
      } else {
        showToast(result.error || 'Incorrect password', 'error')
      }
    } catch (error) {
      showToast('Failed to unlock wallet', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadWalletData = async (address?: string, currentPrices?: CryptoPrices) => {
    const targetAddress = address || walletAddress
    if (!targetAddress) return

    try {
      const prices = currentPrices || await priceService.getCurrentPrices()
      setCryptoPrices(prices)

      // Wallet is already unlocked if we are here
      const ethBalance = await walletService.getBalance(targetAddress)
      const usdcBalance = await walletService.getTokenBalance(SEPOLIA_USDC_ADDRESS, targetAddress)

      setBalance({
        eth: ethBalance,
        usd: (parseFloat(ethBalance) * prices.ETH).toFixed(2),
        usdc: usdcBalance
      })

      const portfolio = await priceService.getPortfolioValue({
        ETH: ethBalance,
        BTC: '0',
        USDC: usdcBalance
      })
      setPortfolioValue(portfolio)

      setGasPrice('15 gwei')
    } catch (error) {
      console.error('Error loading wallet data:', error)
    } finally {
      setRefreshing(false)
    }
  }

  const handleAssetClick = async (asset: 'ETH' | 'BTC' | 'USDC') => {
    setSelectedAsset(asset);
    setCurrentView('asset-details');
    setChartLoading(true);
    try {
      const history = await priceService.getHistoricalPrices(asset, timeframe);
      setHistoricalData(history);
    } catch (error) {
      console.error('Failed to load history:', error);
      showToast('Failed to load chart data', 'error');
    } finally {
      setChartLoading(false);
    }
  };

  const handleCreateWalletStep1 = () => {
    setShowPasswordCreate(true)
    setCurrentView('create')
  }

  const handleCreateWallet = async () => {
    if (password !== confirmPassword) {
      showToast('Passwords do not match', 'error')
      return
    }
    if (password.length < 8) {
      showToast('Password must be at least 8 characters', 'error')
      return
    }

    setLoading(true)
    try {
      const result = await walletService.createWallet(password)
      if (result.success && result.data && 'mnemonic' in result.data) {
        setMnemonic(result.data.mnemonic)
        setWalletAddress(result.data.address)
        setBalance({ eth: '0.000000', usd: '0.00', usdc: '0.00' })
        setShowPasswordCreate(false)
        // Stay on 'create' view to show mnemonic
      } else {
        showToast(result.error || 'Failed to create wallet', 'error')
      }
    } catch (error) {
      showToast('Error creating wallet', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleImportWalletStep1 = () => {
    setShowPasswordCreate(true)
    setCurrentView('import')
  }

  const handleImportWallet = async () => {
    if (!importPhrase) {
      showToast('Please enter your recovery phrase', 'error')
      return
    }
    if (password !== confirmPassword) {
      showToast('Passwords do not match', 'error')
      return
    }
    if (password.length < 8) {
      showToast('Password must be at least 8 characters', 'error')
      return
    }

    setLoading(true)
    try {
      const result = await walletService.createWalletFromMnemonic(importPhrase, password)
      if (result.success && result.data) {
        setWalletAddress(result.data.address)
        await loadWalletData(result.data.address)
        setCurrentView('main')
        setShowPasswordCreate(false)
        setPassword('')
        setConfirmPassword('')
        showToast('Wallet imported successfully', 'success')
      } else {
        showToast(result.error || 'Invalid recovery phrase', 'error')
      }
    } catch (error) {
      showToast('Error importing wallet', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    showToast('Copied to clipboard', 'success')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadWalletData()
  }

  const handleSend = async () => {
    if (!sendAddress || !sendAmount) {
      showToast('Please enter both address and amount', 'error')
      return
    }

    setSending(true)
    try {
      let result;

      if (selectedToken === 'ETH') {
        result = await walletService.sendTransaction(sendAddress, sendAmount)
      } else {
        result = await walletService.sendToken(SEPOLIA_USDC_ADDRESS, sendAddress, sendAmount)
      }

      if (result.success) {
        showToast('Transaction sent! Waiting for confirmation...', 'success')
        setSendAddress('')
        setSendAmount('')
        setCurrentView('main')
        window.open(`https://sepolia.etherscan.io/tx/${result.data?.txHash}`, '_blank')
        await loadWalletData()
      } else {
        showToast(result.error || 'Transaction failed', 'error')
      }
    } catch (error) {
      console.error('Transaction error:', error)
      showToast('Transaction failed', 'error')
    } finally {
      setSending(false)
    }
  }

  const generateQRCode = async () => {
    try {
      const qrDataURL = await QRCode.toDataURL(walletAddress, {
        width: 180,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      })
      setQrCodeUrl(qrDataURL)
    } catch (error) {
      console.error('Error generating QR code:', error)
    }
  }

  const handleBackToMain = () => {
    setCurrentView('main');
    setSelectedAsset(null);
  };

  if (loading) {
    return (
      <div className="w-[360px] h-[600px] bg-zinc-950 text-white flex flex-col items-center justify-center">
        <div className="relative">
          <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full animate-pulse"></div>
          <img src={logo} alt="Verox" className="w-16 h-16 relative z-10 animate-bounce" />
        </div>
      </div>
    )
  }

  // Unlock Screen
  if (isLocked) {
    return (
      <div className="w-[360px] h-[600px] bg-zinc-950 text-white flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        <div className="w-20 h-20 mb-6 relative">
          <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full animate-pulse"></div>
          <img src={logo} alt="Verox" className="w-full h-full object-contain relative z-10" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Welcome Back</h1>
        <p className="text-zinc-400 text-sm mb-8">Enter your password to unlock</p>

        <div className="w-full space-y-4">
          <input
            type="password"
            value={unlockPassword}
            onChange={(e) => setUnlockPassword(e.target.value)}
            placeholder="Password"
            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
            onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
          />
          <button
            onClick={handleUnlock}
            disabled={loading || !unlockPassword}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold transition-all active:scale-95 shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
          >
            {loading ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : 'Unlock Wallet'}
          </button>
        </div>

        <button
          onClick={() => {
            if (confirm('Are you sure? This will wipe your wallet data. You will need your recovery phrase to restore it.')) {
              walletService.resetWallet();
              setIsLocked(false);
              setCurrentView('onboarding');
            }
          }}
          className="mt-6 text-xs text-zinc-600 hover:text-red-400 transition-colors"
        >
          Reset Wallet
        </button>
      </div>
    )
  }

  // Onboarding View
  if (currentView === 'onboarding') {
    return (
      <div className="w-[360px] h-[600px] bg-zinc-950 text-white flex flex-col items-center justify-center p-6 animate-in fade-in duration-500 relative overflow-hidden">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        {/* Background Effects */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[100px] rounded-full"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[100px] rounded-full"></div>
        </div>

        <div className="w-24 h-24 mb-8 relative">
          <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full animate-pulse"></div>
          <img src={logo} alt="Verox" className="w-full h-full object-contain relative z-10" />
        </div>

        <h1 className="text-4xl font-bold tracking-tighter mb-2 bg-gradient-to-br from-white to-zinc-500 bg-clip-text text-transparent">Verox</h1>
        <p className="text-zinc-400 text-center mb-12 max-w-[260px] leading-relaxed">
          The next generation of crypto wallets. Secure, fast, and beautiful.
        </p>

        <div className="w-full space-y-3 z-10">
          <button
            onClick={handleCreateWalletStep1}
            className="w-full py-4 bg-white text-black hover:bg-zinc-200 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-white/10 flex items-center justify-center gap-2 group"
          >
            <WalletIcon className="w-5 h-5" />
            Create New Wallet
          </button>
          <button
            onClick={handleImportWalletStep1}
            className="w-full py-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <ArrowPathIcon className="w-5 h-5" />
            I have a wallet
          </button>
        </div>
      </div>
    )
  }

  // Create Wallet View
  if (currentView === 'create') {
    if (showPasswordCreate) {
      return (
        <div className="w-[360px] h-[600px] bg-zinc-950 text-white flex flex-col p-6 animate-in slide-in-from-right duration-300">
          {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
          <button onClick={() => setCurrentView('onboarding')} className="self-start p-2 -ml-2 mb-4 hover:bg-white/5 rounded-full transition-colors">
            <ArrowLeftIcon className="w-6 h-6 text-zinc-400" />
          </button>

          <h1 className="text-2xl font-bold mb-2">Set Password</h1>
          <p className="text-zinc-400 text-sm mb-8">This password will be used to unlock your wallet on this device.</p>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-zinc-500 ml-1 mb-1 block">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 ml-1 mb-1 block">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div className="mt-auto">
            <button
              onClick={handleCreateWallet}
              disabled={loading || !password || !confirmPassword}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold transition-all active:scale-95 shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
            >
              {loading ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : 'Continue'}
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="w-[360px] h-[600px] bg-zinc-950 text-white flex flex-col p-6 animate-in slide-in-from-right duration-300">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Secret Phrase</h1>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6">
          <p className="text-amber-400 text-xs leading-relaxed">
            Write down these 12 words and keep them safe. You will need them to recover your wallet.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-8">
          {mnemonic.split(' ').map((word, i) => (
            <div key={i} className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-2 flex items-center gap-2">
              <span className="text-zinc-600 text-xs font-mono w-4">{i + 1}</span>
              <span className="text-sm font-medium">{word}</span>
            </div>
          ))}
        </div>

        <div className="mt-auto space-y-3">
          <button
            onClick={() => handleCopy(mnemonic)}
            className="w-full py-3 flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 rounded-xl text-sm font-medium transition-colors mb-4 border border-white/5"
          >
            <ClipboardIcon className="w-4 h-4 text-zinc-400" />
            Copy to Clipboard
          </button>
        </div>

        <button
          onClick={() => setCurrentView('main')}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-semibold transition-all active:scale-95 shadow-lg shadow-indigo-500/20 mt-4"
        >
          I've Saved It
        </button>
      </div>
    )
  }

  // Import Wallet View
  if (currentView === 'import') {
    if (showPasswordCreate) {
      return (
        <div className="w-[360px] h-[600px] bg-zinc-950 text-white flex flex-col p-6 animate-in slide-in-from-right duration-300">
          {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
          <button onClick={() => setCurrentView('onboarding')} className="self-start p-2 -ml-2 mb-4 hover:bg-white/5 rounded-full transition-colors">
            <ArrowLeftIcon className="w-6 h-6 text-zinc-400" />
          </button>

          <h1 className="text-2xl font-bold mb-2">Set Password</h1>
          <p className="text-zinc-400 text-sm mb-8">This password will be used to unlock your wallet on this device.</p>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-zinc-500 ml-1 mb-1 block">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 ml-1 mb-1 block">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div className="mt-auto">
            <button
              onClick={() => setShowPasswordCreate(false)} // Proceed to mnemonic entry
              disabled={!password || !confirmPassword || password !== confirmPassword || password.length < 8}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold transition-all active:scale-95 shadow-lg shadow-indigo-500/20"
            >
              Continue
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="w-[360px] h-[600px] bg-zinc-950 text-white flex flex-col p-6 animate-in slide-in-from-right duration-300">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        <button onClick={() => setShowPasswordCreate(true)} className="self-start p-2 -ml-2 mb-4 hover:bg-white/5 rounded-full transition-colors">
          <ArrowLeftIcon className="w-6 h-6 text-zinc-400" />
        </button>

        <h1 className="text-2xl font-bold mb-2">Import Wallet</h1>
        <p className="text-zinc-400 text-sm mb-6">Enter your 12-word secret recovery phrase.</p>

        <textarea
          value={importPhrase}
          onChange={(e) => setImportPhrase(e.target.value)}
          placeholder="separate each word with a space"
          className="w-full h-32 bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-sm focus:outline-none focus:border-indigo-500 transition-colors resize-none mb-4"
        />

        <button
          onClick={handleImportWallet}
          disabled={loading || !importPhrase}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold transition-all active:scale-95 shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
        >
          {loading ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : 'Import Wallet'}
        </button>
      </div>
    )
  }

  // Asset Details View with Chart
  if (currentView === 'asset-details' && selectedAsset) {
    const currentPrice = cryptoPrices[selectedAsset];
    const isPositive = historicalData.length > 0 && currentPrice >= historicalData[0].price;


    return (
      <div className="w-[360px] h-[600px] bg-zinc-950 text-white flex flex-col animate-in slide-in-from-right duration-300">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

        <header className="px-5 py-4 flex items-center justify-between bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-20 border-b border-white/5">
          <div className="flex items-center gap-3">
            <button onClick={handleBackToMain} className="p-2 -ml-2 hover:bg-white/5 rounded-full transition-colors">
              <ArrowLeftIcon className="w-5 h-5 text-zinc-400" />
            </button>
            <span className="font-bold text-lg tracking-tight text-white">{selectedAsset}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
              <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider">Live</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col">
          <div className="px-5 pt-6 pb-2">
            <h1 className="text-3xl font-bold tracking-tighter mb-1 font-mono">
              ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h1>
            <div className={`flex items-center gap-1.5 text-xs font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
              <ArrowUpIcon className={`w-3 h-3 ${isPositive ? '' : 'rotate-180'}`} />
              <span>{timeframe} Change</span>
            </div>
          </div>

          {/* Chart Controls */}
          <div className="px-5 flex gap-2 mb-4">
            {(['1D', '1W', '1M'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => handleTimeframeChange(tf)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${timeframe === tf
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
                  }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Chart */}
          <div className="h-64 w-full relative min-w-0">
            {chartLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/50 z-10 backdrop-blur-sm">
                <ArrowPathIcon className="w-6 h-6 animate-spin text-zinc-600" />
              </div>
            )}

            {historicalData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={historicalData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis
                    dataKey="timestamp"
                    tick={{ fontSize: 10, fill: '#52525b' }}
                    tickFormatter={(ts) => {
                      const date = new Date(ts);
                      return timeframe === '1D'
                        ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
                    }}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={40}
                  />
                  <YAxis
                    domain={['auto', 'auto']}
                    orientation="right"
                    tick={{ fontSize: 10, fill: '#52525b' }}
                    tickFormatter={(val) => `$${val.toLocaleString()}`}
                    axisLine={false}
                    tickLine={false}
                    width={50}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(24, 24, 27, 0.9)',
                      border: '1px solid #27272a',
                      borderRadius: '8px',
                      backdropFilter: 'blur(4px)',
                      padding: '8px 12px'
                    }}
                    itemStyle={{ color: '#e4e4e7', fontSize: '12px', fontFamily: 'monospace' }}
                    labelStyle={{ color: '#a1a1aa', fontSize: '10px', marginBottom: '4px' }}
                    labelFormatter={(label) => new Date(label).toLocaleString()}
                    formatter={(value: number) => [`$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Price']}
                    cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '4 4' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorPrice)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500">
                <p className="text-sm">No chart data available</p>
                <p className="text-xs opacity-50 mt-1">Try a different timeframe</p>
              </div>
            )}
          </div>

          {/* Asset Info */}
          <div className="flex-1 px-5 py-6 space-y-4 bg-zinc-950 border-t border-white/5">
            <div className="glass-card p-4 rounded-2xl">
              <h3 className="text-xs font-medium text-zinc-500 mb-1 uppercase tracking-wider">Your Balance</h3>
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-2xl font-bold text-white font-mono">
                    {selectedAsset === 'ETH' ? balance.eth : selectedAsset === 'USDC' ? balance.usdc : '0.00125'}
                    <span className="text-sm text-zinc-500 ml-2 font-sans">{selectedAsset}</span>
                  </div>
                  <div className="text-sm text-zinc-400 font-medium mt-1">
                    ≈ ${(
                      (selectedAsset === 'ETH' ? parseFloat(balance.eth) : selectedAsset === 'USDC' ? parseFloat(balance.usdc) : 0.00125) * currentPrice
                    ).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={handleSend} className="py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-semibold transition-all active:scale-95 shadow-lg shadow-indigo-500/20 text-sm">
                Send
              </button>
              <button onClick={() => setCurrentView('receive')} className="py-3 bg-zinc-900 hover:bg-zinc-800 border border-white/5 rounded-xl font-semibold transition-all active:scale-95 text-sm">
                Receive
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Existing Views (Send, Receive)
  if (currentView === 'send') {
    return (
      <div className="w-[360px] h-[600px] bg-zinc-950 text-white flex flex-col p-4 animate-in slide-in-from-right duration-300">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

        <div className="flex items-center mb-6">
          <button onClick={handleBackToMain} className="p-2 -ml-2 hover:bg-zinc-800/50 rounded-full transition-colors">
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold ml-2">Send {selectedToken}</h2>
        </div>

        <div className="flex-1 space-y-6">
          {/* Token Selector */}
          <div className="space-y-2">
            <label className="text-xs text-zinc-400 ml-1 font-medium">Asset</label>
            <div className="relative">
              <select
                value={selectedToken}
                onChange={(e) => setSelectedToken(e.target.value as 'ETH' | 'USDC')}
                className="w-full bg-zinc-900/50 border border-white/10 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer"
              >
                <option value="ETH">Ethereum (ETH)</option>
                <option value="USDC">USD Coin (USDC)</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <ChevronDownIcon className="w-4 h-4 text-zinc-400" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-zinc-400 ml-1 font-medium">Recipient Address</label>
            <div className="relative group">
              <input
                type="text"
                value={sendAddress}
                onChange={(e) => setSendAddress(e.target.value)}
                placeholder="0x..."
                className="w-full bg-zinc-900/50 border border-white/10 rounded-xl p-4 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all group-hover:border-white/20"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">
                <MagnifyingGlassIcon className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-zinc-400 ml-1 font-medium">Amount</label>
            <div className="relative group">
              <input
                type="number"
                value={sendAmount}
                onChange={(e) => setSendAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-zinc-900/50 border border-white/10 rounded-xl p-4 pr-16 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all group-hover:border-white/20"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <span className="text-xs font-bold bg-zinc-800 px-2 py-1 rounded text-zinc-300">{selectedToken}</span>
              </div>
            </div>
            <div className="flex justify-between text-xs px-1">
              <span className="text-zinc-500">
                Available: {selectedToken === 'ETH' ? balance.eth : balance.usdc} {selectedToken}
              </span>
              <button
                onClick={() => {
                  const max = selectedToken === 'ETH'
                    ? (parseFloat(balance.eth) - 0.001).toFixed(4)
                    : balance.usdc
                  setSendAmount(max)
                }}
                className="text-indigo-400 hover:text-indigo-300 font-medium"
              >
                Max
              </button>
            </div>
          </div>

          <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-4 space-y-3 mt-4">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500">Gas Fee</span>
              <span className="text-zinc-300 font-mono">{gasPrice}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500">Total</span>
              <span className="text-zinc-300 font-medium font-mono">
                {sendAmount ? parseFloat(sendAmount).toFixed(6) : '0.00'} {selectedToken}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={handleSend}
          disabled={sending}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 rounded-xl font-semibold transition-all active:scale-95 shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
        >
          {sending ? (
            <>
              <ArrowPathIcon className="w-5 h-5 animate-spin" />
              Sending...
            </>
          ) : (
            'Confirm Send'
          )}
        </button>
      </div>
    )
  }

  if (currentView === 'receive') {
    return (
      <div className="w-[360px] h-[600px] bg-zinc-950 text-white flex flex-col p-4 animate-in slide-in-from-right duration-300">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

        <div className="flex items-center mb-6">
          <button onClick={handleBackToMain} className="p-2 -ml-2 hover:bg-zinc-800/50 rounded-full transition-colors">
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold ml-2">Receive ETH</h2>
        </div>

        <div className="flex-1 flex flex-col items-center pt-8">
          <div className="bg-white p-4 rounded-3xl mb-8 shadow-2xl shadow-indigo-500/20 ring-4 ring-white/5">
            {qrCodeUrl && <img src={qrCodeUrl} alt="Wallet QR Code" className="w-48 h-48" />}
          </div>

          <p className="text-zinc-400 text-sm mb-3 font-medium">Your Address</p>
          <button
            onClick={() => handleCopy(walletAddress)}
            className="flex items-center gap-3 bg-zinc-900/50 hover:bg-zinc-800/50 border border-white/5 hover:border-white/10 px-5 py-4 rounded-2xl transition-all group w-full max-w-[300px] active:scale-95"
          >
            <span className="text-sm font-mono truncate text-zinc-300 group-hover:text-white transition-colors flex-1 text-center">
              {walletAddress}
            </span>
            {copied ? (
              <CheckCircleIcon className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            ) : (
              <ClipboardIcon className="w-5 h-5 text-zinc-500 group-hover:text-white flex-shrink-0 transition-colors" />
            )}
          </button>

          <div className="mt-8 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl max-w-[280px]">
            <p className="text-xs text-indigo-300 text-center leading-relaxed">
              Send only ETH and ERC-20 tokens to this address. Sending other assets may result in permanent loss.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Main View
  return (
    <div className="w-[360px] h-[600px] bg-zinc-950 text-white flex flex-col overflow-hidden font-sans selection:bg-indigo-500/30 animate-in fade-in duration-500">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <header className="px-5 py-4 flex items-center justify-between bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-20 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-zinc-900 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/10 border border-white/5">
            <img src={logo} alt="Verox" className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg tracking-tight text-white">Verox</span>
          <div className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
            <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider">Sepolia</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className={`p-2 hover:bg-white/5 rounded-full transition-colors ${refreshing ? 'animate-spin' : ''}`}
          >
            <ArrowPathIcon className="w-5 h-5 text-zinc-400 hover:text-white transition-colors" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto no-scrollbar pb-24">
        {/* Balance Card */}
        <div className="p-6 flex flex-col items-center relative overflow-hidden">
          {/* Background glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -z-10"></div>

          <span className="text-zinc-400 text-sm font-medium mb-2">Total Balance</span>
          <h1 className="text-5xl font-bold tracking-tighter mb-2 bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-400">
            ${portfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h1>
          <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full text-xs font-medium mb-10 border border-emerald-500/20">
            <ArrowUpIcon className="w-3 h-3" />
            <span>+2.45%</span>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-4 gap-4 w-full mb-10 px-2">
            <button onClick={handleSend} className="flex flex-col items-center gap-2 group">
              <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 group-hover:bg-indigo-500 transition-all duration-300">
                <ArrowUpIcon className="w-6 h-6 rotate-45 text-white" />
              </div>
              <span className="text-xs font-medium text-zinc-400 group-hover:text-zinc-200 transition-colors">Send</span>
            </button>
            <button onClick={() => setCurrentView('receive')} className="flex flex-col items-center gap-2 group">
              <div className="w-14 h-14 bg-zinc-900 border border-white/5 rounded-2xl flex items-center justify-center group-hover:bg-zinc-800 group-hover:border-white/10 transition-all duration-300">
                <ArrowUpIcon className="w-6 h-6 rotate-[225deg] text-zinc-300 group-hover:text-white" />
              </div>
              <span className="text-xs font-medium text-zinc-400 group-hover:text-zinc-200 transition-colors">Receive</span>
            </button>
            <button
              onClick={() => showToast('Swap feature coming soon!', 'info')}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-14 h-14 bg-zinc-900 border border-white/5 rounded-2xl flex items-center justify-center group-hover:bg-zinc-800 group-hover:border-white/10 transition-all duration-300">
                <ArrowsRightLeftIcon className="w-6 h-6 text-zinc-300 group-hover:text-white" />
              </div>
              <span className="text-xs font-medium text-zinc-400 group-hover:text-zinc-200 transition-colors">Swap</span>
            </button>
            <button
              onClick={() => showToast('Buy feature coming soon!', 'info')}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-14 h-14 bg-zinc-900 border border-white/5 rounded-2xl flex items-center justify-center group-hover:bg-zinc-800 group-hover:border-white/10 transition-all duration-300">
                <CurrencyDollarIcon className="w-6 h-6 text-zinc-300 group-hover:text-white" />
              </div>
              <span className="text-xs font-medium text-zinc-400 group-hover:text-zinc-200 transition-colors">Buy</span>
            </button>
          </div>

          {/* Assets List */}
          <div className="w-full px-1">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg text-zinc-100">Assets</h3>
              <button className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors">See All</button>
            </div>

            <div className="space-y-3">
              {/* ETH */}
              <div
                onClick={() => handleAssetClick('ETH')}
                className="glass-card p-4 rounded-2xl flex items-center justify-between cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center p-2 ring-2 ring-white/5 group-hover:ring-indigo-500/20 transition-all">
                    <img src="https://cryptologos.cc/logos/ethereum-eth-logo.png?v=026" alt="ETH" className="w-full h-full object-contain" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-zinc-100">Ethereum</span>
                    <span className="text-xs text-zinc-500 font-medium">ETH</span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-bold text-zinc-100">{balance.eth}</span>
                  <span className="text-xs text-zinc-500 font-medium">${balance.usd}</span>
                </div>
              </div>

              {/* USDC (Real) */}
              <div
                onClick={() => handleAssetClick('USDC')}
                className="glass-card p-4 rounded-2xl flex items-center justify-between cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center p-2 ring-2 ring-white/5 group-hover:ring-blue-500/20 transition-all">
                    <img src="https://cryptologos.cc/logos/usd-coin-usdc-logo.png?v=026" alt="USDC" className="w-full h-full object-contain" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-zinc-100">USD Coin</span>
                    <span className="text-xs text-zinc-500 font-medium">USDC</span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-bold text-zinc-100">{balance.usdc}</span>
                  <span className="text-xs text-zinc-500 font-medium">${balance.usdc}</span>
                </div>
              </div>


            </div>
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <div className="absolute bottom-0 left-0 w-full bg-zinc-950/80 backdrop-blur-xl border-t border-white/5 px-8 py-4 flex justify-between items-center z-20">
        <button className="flex flex-col items-center gap-1.5 text-indigo-400 group">
          <div className="w-10 h-8 flex items-center justify-center bg-indigo-500/10 rounded-full group-hover:bg-indigo-500/20 transition-colors">
            <HomeIcon className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-semibold">Home</span>
        </button>
        <button
          onClick={async () => {
            if (confirm('Are you sure you want to reset your wallet? This will create a new address.')) {
              await walletService.resetWallet()
              window.location.reload()
            }
          }}
          className="flex flex-col items-center gap-1.5 text-zinc-600 hover:text-zinc-300 transition-colors group"
        >
          <div className="w-10 h-8 flex items-center justify-center group-hover:bg-white/5 rounded-full transition-colors">
            <Cog6ToothIcon className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-medium">Reset</span>
        </button>
      </div>
    </div>
  )
}

export default App

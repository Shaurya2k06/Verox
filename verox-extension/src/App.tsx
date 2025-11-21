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
  WalletIcon
} from '@heroicons/react/24/outline'
import { walletService } from './services/wallet'
import { priceService, type CryptoPrices } from './services/price'
import logo from './assets/logo.png'

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
  const [balance, setBalance] = useState<{ eth: string; usd: string }>({ eth: '0.000000', usd: '0.00' })
  const [gasPrice, setGasPrice] = useState('N/A')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [currentView, setCurrentView] = useState<'onboarding' | 'create' | 'import' | 'main' | 'send' | 'receive'>('onboarding')
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
  const [sendAmount, setSendAmount] = useState('')
  const [sendAddress, setSendAddress] = useState('')
  const [sending, setSending] = useState(false)
  const [cryptoPrices, setCryptoPrices] = useState<CryptoPrices>({ ETH: 0, BTC: 0, USDC: 0 })
  const [portfolioValue, setPortfolioValue] = useState<number>(0)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [mnemonic, setMnemonic] = useState<string>('')
  const [importPhrase, setImportPhrase] = useState('')

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type })
  }

  useEffect(() => {
    initializeApp()
  }, [])

  useEffect(() => {
    if (currentView === 'receive' && !qrCodeUrl) {
      generateQRCode()
    }
  }, [currentView, qrCodeUrl])

  const initializeApp = async () => {
    setLoading(true)

    try {
      // Get current crypto prices
      const prices = await priceService.getCurrentPrices()
      setCryptoPrices(prices)

      // Check if wallet exists in storage
      let currentAddress = await walletService.getStoredWallet()

      if (currentAddress) {
        setWalletAddress(currentAddress)

        // Get balance from local storage via wallet service
        const unlockResult = await walletService.unlockWallet()
        if (unlockResult.success && unlockResult.data) {
          const ethBalance = unlockResult.data.balance
          setBalance({
            eth: ethBalance,
            usd: (parseFloat(ethBalance) * prices.ETH).toFixed(2)
          })

          // Calculate portfolio value
          const portfolio = await priceService.getPortfolioValue({
            ETH: ethBalance,
            BTC: '0.00125',
            USDC: '250'
          })
          setPortfolioValue(portfolio)
          setCurrentView('main')
        }
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

  const loadWalletData = async () => {
    setLoading(true)
    try {
      const prices = await priceService.getCurrentPrices()
      setCryptoPrices(prices)

      const unlockResult = await walletService.unlockWallet()
      if (unlockResult.success && unlockResult.data) {
        const ethBalance = unlockResult.data.balance
        setBalance({
          eth: ethBalance,
          usd: (parseFloat(ethBalance) * prices.ETH).toFixed(2)
        })

        // Update portfolio
        const portfolio = await priceService.getPortfolioValue({
          ETH: ethBalance,
          BTC: '0.00125',
          USDC: '250'
        })
        setPortfolioValue(portfolio)
      }

      // Mock gas price for now as we don't have a real provider
      setGasPrice('15 gwei')
    } catch (error) {
      console.error('Error loading wallet data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleCreateWallet = async () => {
    setLoading(true)
    try {
      const result = await walletService.createWallet()
      if (result.success && result.data && 'mnemonic' in result.data) {
        setMnemonic(result.data.mnemonic)
        setWalletAddress(result.data.address)
        setBalance({
          eth: result.data.balance,
          usd: (parseFloat(result.data.balance) * cryptoPrices.ETH).toFixed(2)
        })
        setCurrentView('create')
      } else {
        showToast('Failed to create wallet', 'error')
      }
    } catch (error) {
      console.error('Create wallet error:', error)
      showToast('Failed to create wallet', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleImportWallet = async () => {
    if (!importPhrase) {
      showToast('Please enter your recovery phrase', 'error')
      return
    }

    setLoading(true)
    try {
      const result = await walletService.createWalletFromMnemonic(importPhrase)
      if (result.success && result.data) {
        setWalletAddress(result.data.address)
        setBalance({
          eth: result.data.balance,
          usd: (parseFloat(result.data.balance) * cryptoPrices.ETH).toFixed(2)
        })
        setCurrentView('main')
        showToast('Wallet imported successfully', 'success')
      } else {
        showToast(result.error || 'Invalid recovery phrase', 'error')
      }
    } catch (error) {
      console.error('Import wallet error:', error)
      showToast('Failed to import wallet', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadWalletData()
  }

  const handleSend = () => {
    setCurrentView('send')
  }

  const handleBackToMain = () => {
    setCurrentView('main')
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

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Copy failed:', error)
    }
  }

  const handleSendTransaction = async () => {
    if (!sendAddress || !sendAmount) {
      showToast('Please enter both address and amount', 'error')
      return
    }

    setSending(true)
    try {
      const result = await walletService.sendTransaction(sendAddress, sendAmount)

      if (result.success) {
        showToast('Transaction sent! Waiting for confirmation...', 'success')
        setSendAddress('')
        setSendAmount('')
        setCurrentView('main')

        // Open Etherscan in new tab
        window.open(`https://sepolia.etherscan.io/tx/${result.data?.txHash}`, '_blank')

        // Refresh wallet data
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

  // Onboarding Views
  if (currentView === 'onboarding') {
    return (
      <div className="w-[360px] h-[600px] bg-zinc-950 text-white flex flex-col p-6 relative overflow-hidden animate-in fade-in duration-500">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

        <div className="flex-1 flex flex-col items-center justify-center text-center z-10">
          <div className="relative mb-8 group">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
            <div className="w-24 h-24 bg-zinc-900/50 backdrop-blur-xl rounded-3xl flex items-center justify-center ring-1 ring-white/10 shadow-2xl relative z-10">
              <img src={logo} alt="Verox" className="w-16 h-16 drop-shadow-lg" />
            </div>
          </div>

          <h1 className="text-3xl font-bold mb-3 tracking-tight">
            <span className="text-gradient">Verox</span>
          </h1>
          <p className="text-zinc-400 mb-10 text-sm leading-relaxed max-w-[260px]">
            The next generation crypto wallet for the decentralized web.
          </p>

          <div className="w-full space-y-3">
            <button
              onClick={handleCreateWallet}
              className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-2xl font-semibold transition-all active:scale-95 shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 group"
            >
              <WalletIcon className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              Create New Wallet
            </button>
            <button
              onClick={() => setCurrentView('import')}
              className="w-full py-4 bg-zinc-900/50 hover:bg-zinc-800/50 border border-white/5 hover:border-white/10 rounded-2xl font-medium transition-all active:scale-95 backdrop-blur-sm"
            >
              I already have a wallet
            </button>
          </div>
        </div>

        {/* Background decorations */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>
      </div>
    )
  }

  if (currentView === 'create') {
    return (
      <div className="w-[360px] h-[600px] bg-zinc-950 text-white flex flex-col p-6 animate-in slide-in-from-right duration-300">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

        <div className="flex items-center mb-8">
          <button onClick={() => setCurrentView('onboarding')} className="p-2 -ml-2 hover:bg-zinc-800/50 rounded-full transition-colors">
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold ml-2">Secret Recovery Phrase</h2>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl mb-6 backdrop-blur-sm">
            <p className="text-amber-500 text-xs font-medium flex gap-2 leading-relaxed">
              <span className="text-lg">⚠️</span>
              Write down these 12 words and keep them safe. Do not share them with anyone.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-8">
            {mnemonic.split(' ').map((word, index) => (
              <div key={index} className="bg-zinc-900/50 border border-white/5 rounded-lg p-2.5 flex items-center gap-2 hover:border-indigo-500/30 transition-colors group">
                <span className="text-zinc-600 text-xs w-4 group-hover:text-indigo-500/50 transition-colors">{index + 1}</span>
                <span className="text-sm font-medium text-zinc-200">{word}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => {
              navigator.clipboard.writeText(mnemonic)
              showToast('Copied to clipboard', 'success')
            }}
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

  if (currentView === 'import') {
    return (
      <div className="w-[360px] h-[600px] bg-zinc-950 text-white flex flex-col p-6 animate-in slide-in-from-right duration-300">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

        <div className="flex items-center mb-8">
          <button onClick={() => setCurrentView('onboarding')} className="p-2 -ml-2 hover:bg-zinc-800/50 rounded-full transition-colors">
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold ml-2">Import Wallet</h2>
        </div>

        <div className="flex-1">
          <p className="text-zinc-400 text-sm mb-4 leading-relaxed">
            Enter your 12-word Secret Recovery Phrase to restore your wallet.
          </p>

          <textarea
            value={importPhrase}
            onChange={(e) => setImportPhrase(e.target.value)}
            placeholder="Separate each word with a space..."
            className="w-full h-48 bg-zinc-900/50 border border-white/10 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none mb-4 placeholder:text-zinc-600"
          />
        </div>

        <button
          onClick={handleImportWallet}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-semibold transition-all active:scale-95 shadow-lg shadow-indigo-500/20"
        >
          Import Wallet
        </button>
      </div>
    )
  }

  // Existing Views (Main, Send, Receive)
  if (currentView === 'send') {
    return (
      <div className="w-[360px] h-[600px] bg-zinc-950 text-white flex flex-col p-4 animate-in slide-in-from-right duration-300">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

        <div className="flex items-center mb-6">
          <button onClick={handleBackToMain} className="p-2 -ml-2 hover:bg-zinc-800/50 rounded-full transition-colors">
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold ml-2">Send ETH</h2>
        </div>

        <div className="flex-1 space-y-6">
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
            <label className="text-xs text-zinc-400 ml-1 font-medium">Amount (ETH)</label>
            <div className="relative group">
              <input
                type="number"
                value={sendAmount}
                onChange={(e) => setSendAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-zinc-900/50 border border-white/10 rounded-xl p-4 pr-16 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all group-hover:border-white/20"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <span className="text-xs font-bold bg-zinc-800 px-2 py-1 rounded text-zinc-300">ETH</span>
              </div>
            </div>
            <div className="flex justify-between text-xs px-1">
              <span className="text-zinc-500">Available: {balance.eth} ETH</span>
              <button
                onClick={() => setSendAmount((parseFloat(balance.eth) - 0.001).toFixed(4))}
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
                {sendAmount ? (parseFloat(sendAmount) + 0.000021).toFixed(6) : '0.00'} ETH
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={handleSendTransaction}
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
            onClick={copyAddress}
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
          <span className="font-bold text-lg tracking-tight text-gradient">Verox</span>
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
              <div className="glass-card p-4 rounded-2xl flex items-center justify-between cursor-pointer group">
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

              {/* BTC (Mock) */}
              <div className="glass-card p-4 rounded-2xl flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center p-2 ring-2 ring-white/5 group-hover:ring-orange-500/20 transition-all">
                    <img src="https://cryptologos.cc/logos/bitcoin-btc-logo.png?v=026" alt="BTC" className="w-full h-full object-contain" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-zinc-100">Bitcoin</span>
                    <span className="text-xs text-zinc-500 font-medium">BTC</span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-bold text-zinc-100">0.00125</span>
                  <span className="text-xs text-zinc-500 font-medium">${(0.00125 * cryptoPrices.BTC).toFixed(2)}</span>
                </div>
              </div>

              {/* USDC (Mock) */}
              <div className="glass-card p-4 rounded-2xl flex items-center justify-between cursor-pointer group">
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
                  <span className="font-bold text-zinc-100">250.00</span>
                  <span className="text-xs text-zinc-500 font-medium">$250.00</span>
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

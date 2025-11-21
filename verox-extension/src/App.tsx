import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import {
  FingerPrintIcon,
  ClipboardIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  CurrencyDollarIcon,
  FireIcon,
  ArrowLeftIcon,
  ArrowUpIcon,
  ArrowsRightLeftIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline'
import { EtherscanService, type EtherscanBalance } from './services/etherscan'
import { walletService } from './services/wallet'
import { priceService, type CryptoPrices } from './services/price'

function App() {
  const [walletAddress, setWalletAddress] = useState('0x742d35Cc6634C0532925a3b8d0b4E1b87D5E2d3c')
  const [balance, setBalance] = useState<EtherscanBalance>({ eth: '0.000000', usd: '0.00' })
  const [gasPrice, setGasPrice] = useState('N/A')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [currentView, setCurrentView] = useState<'main' | 'send' | 'receive'>('main')
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
  const [sendAmount, setSendAmount] = useState('')
  const [sendAddress, setSendAddress] = useState('')
  const [sending, setSending] = useState(false)
  const [cryptoPrices, setCryptoPrices] = useState<CryptoPrices>({ ETH: 0, BTC: 0, USDC: 0 })
  const [portfolioValue, setPortfolioValue] = useState<number>(0)

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
      const storedAddress = await walletService.getStoredWallet()

      if (storedAddress) {
        setWalletAddress(storedAddress)

        // Try to unlock existing wallet
        const unlockResult = await walletService.unlockWallet()
        if (unlockResult.success && unlockResult.data) {
          const ethBalance = unlockResult.data.balance || '0.000000'
          setBalance({
            eth: ethBalance,
            usd: (parseFloat(ethBalance) * prices.ETH).toFixed(2)
          })

          // Calculate portfolio value
          const portfolio = await priceService.getPortfolioValue({
            ETH: ethBalance,
            BTC: '0.001', // Mock BTC balance
            USDC: '100' // Mock USDC balance
          })
          setPortfolioValue(portfolio)
        }
      } else {
        // No wallet found, create a new one
        const createResult = await walletService.createWallet()
        if (createResult.success && createResult.data) {
          setWalletAddress(createResult.data.address)
          setBalance({
            eth: createResult.data.balance,
            usd: '0.00'
          })
        }
      }

      // Check biometric availability - this will be handled by the wallet service

      // Load additional wallet data
      await loadWalletData()
    } catch (error) {
      console.error('App initialization error:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadWalletData = async () => {
    setLoading(true)
    try {
      const [balanceData, gasPriceData] = await Promise.all([
        EtherscanService.getBalance(walletAddress),
        EtherscanService.getGasPrice()
      ])

      setBalance(balanceData)
      setGasPrice(gasPriceData)
    } catch (error) {
      console.error('Error loading wallet data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
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

  const handleBiometricAuth = async () => {
    try {
      const result = await walletService.verifyBiometric()

      if (result.success && result.data) {
        if (result.data.verified) {
          alert(`✅ ${result.data.method} verification successful!`)
        } else {
          alert('❌ Biometric verification failed')
        }
      } else {
        alert(`⚠️ ${result.error || 'Biometric verification error'}`)
      }
    } catch (error) {
      console.error('Biometric auth error:', error)
      alert('❌ Biometric authentication failed')
    }
  }

  const handleSendTransaction = async () => {
    if (!sendAddress || !sendAmount) {
      alert('Please enter both address and amount')
      return
    }

    setSending(true)
    try {
      const result = await walletService.sendTransaction(sendAddress, sendAmount, gasPrice)

      if (result.success && result.data) {
        // Save transaction to local storage
        await walletService.saveTransaction(result.data.txHash, sendAddress, sendAmount)

        alert(`✅ Transaction sent!\nTx Hash: ${result.data.txHash.slice(0, 10)}...`)

        // Reset form and go back to main
        setSendAmount('')
        setSendAddress('')
        setCurrentView('main')

        // Refresh balance
        await loadWalletData()
      } else {
        alert(`❌ Transaction failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Send transaction error:', error)
      alert('❌ Transaction failed')
    } finally {
      setSending(false)
    }
  }

  const handleBuyEth = () => {
    // Open a buy ETH page - for now just show an alert
    alert('🚀 Buy ETH feature coming soon!\n\nYou can buy ETH on exchanges like Coinbase, Binance, or Uniswap.')
  }

  const handleSwapTokens = () => {
    // Open swap interface - for now just show an alert  
    alert('🔄 Token swap feature coming soon!\n\nYou will be able to swap between different cryptocurrencies.')
  }

  if (loading) {
    return (
      <div className="w-[360px] h-[600px] bg-zinc-950 text-white flex items-center justify-center border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="flex flex-col items-center gap-3">
          <ArrowPathIcon className="w-8 h-8 animate-spin text-violet-500" />
          <span className="text-zinc-400 text-sm font-medium">Loading wallet...</span>
        </div>
      </div>
    )
  }

  // Send View
  if (currentView === 'send') {
    return (
      <div className="w-[360px] h-[600px] bg-zinc-950 text-white flex flex-col border border-zinc-800 rounded-xl overflow-hidden shadow-2xl font-sans">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-900 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBackToMain}
              className="p-2 -ml-2 rounded-full hover:bg-zinc-900 text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <span className="font-semibold text-lg tracking-tight">Send ETH</span>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 p-6 flex flex-col gap-6">
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">To Address</label>
            <input
              type="text"
              placeholder="0x..."
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
              value={sendAddress}
              onChange={(e) => setSendAddress(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Amount</label>
            <div className="relative">
              <input
                type="number"
                placeholder="0.0"
                step="0.000001"
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all pr-16"
                value={sendAmount}
                onChange={(e) => setSendAmount(e.target.value)}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-500">ETH</span>
            </div>
            <div className="flex justify-end">
              <span className="text-xs text-zinc-500">
                Available: <span className="text-zinc-300">{balance.eth} ETH</span>
              </span>
            </div>
          </div>

          <div className="mt-auto flex gap-3">
            <button
              onClick={handleBackToMain}
              className="flex-1 py-3.5 px-4 rounded-xl bg-zinc-900 border border-zinc-800 text-sm font-medium hover:bg-zinc-800 transition-colors text-zinc-300"
            >
              Cancel
            </button>
            <button
              onClick={handleSendTransaction}
              disabled={sending}
              className="flex-1 py-3.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium shadow-lg shadow-violet-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {sending ? (
                <>
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                'Send ETH'
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Receive View
  if (currentView === 'receive') {
    return (
      <div className="w-[360px] h-[600px] bg-zinc-950 text-white flex flex-col border border-zinc-800 rounded-xl overflow-hidden shadow-2xl font-sans">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-900 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBackToMain}
              className="p-2 -ml-2 rounded-full hover:bg-zinc-900 text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <span className="font-semibold text-lg tracking-tight">Receive ETH</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 flex flex-col items-center justify-center gap-8">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
            <div className="relative bg-white p-4 rounded-xl">
              {qrCodeUrl ? (
                <img src={qrCodeUrl} alt="Wallet QR Code" className="w-48 h-48 object-contain" />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center">
                  <ArrowPathIcon className="w-8 h-8 animate-spin text-zinc-300" />
                </div>
              )}
            </div>
          </div>

          <div className="w-full space-y-3">
            <label className="block text-center text-xs font-medium text-zinc-500 uppercase tracking-wider">Your Wallet Address</label>
            <div
              onClick={copyAddress}
              className="group relative w-full bg-zinc-900/50 border border-zinc-800 hover:border-violet-500/50 rounded-xl p-4 cursor-pointer transition-all active:scale-[0.98]"
            >
              <p className="font-mono text-xs text-zinc-400 break-all text-center group-hover:text-zinc-200 transition-colors">
                {walletAddress}
              </p>
              <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/80 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl backdrop-blur-sm">
                <div className="flex items-center gap-2 text-violet-400 font-medium text-sm">
                  {copied ? (
                    <>
                      <CheckCircleIcon className="w-5 h-5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <ClipboardIcon className="w-5 h-5" />
                      <span>Click to Copy</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleBackToMain}
            className="w-full py-3.5 px-4 rounded-xl bg-zinc-900 border border-zinc-800 text-sm font-medium hover:bg-zinc-800 transition-colors text-zinc-300 mt-auto"
          >
            Done
          </button>
        </div>
      </div>
    )
  }

  // Main View
  return (
    <div className="w-[360px] h-[600px] bg-zinc-950 text-white flex flex-col border border-zinc-800 rounded-xl overflow-hidden shadow-2xl font-sans selection:bg-violet-500/30">
      {/* Top Header */}
      <div className="px-5 py-4 flex justify-between items-center bg-zinc-950/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/50 rounded-full border border-zinc-800/50 hover:border-zinc-700 transition-colors cursor-pointer group">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <span className="text-[10px] font-bold text-white">V</span>
          </div>
          <span className="text-sm font-medium text-zinc-200 group-hover:text-white">Verox</span>
          <ChevronDownIcon className="w-3 h-3 text-zinc-500 group-hover:text-zinc-300" />
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 rounded-full hover:bg-zinc-900 text-zinc-500 hover:text-violet-400 transition-all active:scale-90"
        >
          <ArrowPathIcon className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Main Balance */}
      <div className="px-6 py-8 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-violet-600/10 rounded-full blur-[80px] -z-10"></div>

        <h1 className="text-5xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-400 mb-2">
          ${portfolioValue > 0 ? portfolioValue.toFixed(2) : balance.usd}
        </h1>

        <button
          onClick={copyAddress}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/50 border border-zinc-800/50 hover:bg-zinc-900 hover:border-zinc-700 transition-all group cursor-pointer"
        >
          <span className="text-xs text-zinc-500 font-mono group-hover:text-zinc-300 transition-colors">
            {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
          </span>
          {copied ? (
            <CheckCircleIcon className="w-3.5 h-3.5 text-green-500" />
          ) : (
            <ClipboardIcon className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400" />
          )}
        </button>
      </div>

      {/* Actions */}
      <div className="px-6 grid grid-cols-3 gap-4 mb-8">
        {[
          { icon: CurrencyDollarIcon, label: 'Buy', action: handleBuyEth },
          { icon: ArrowUpIcon, label: 'Send', action: handleSend },
          { icon: ArrowsRightLeftIcon, label: 'Swap', action: handleSwapTokens },
        ].map((btn, idx) => (
          <button
            key={idx}
            onClick={btn.action}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-violet-400 group-hover:scale-110 group-hover:bg-zinc-800 group-hover:border-violet-500/30 group-hover:text-violet-300 transition-all duration-300 shadow-lg shadow-black/20">
              <btn.icon className="w-6 h-6" />
            </div>
            <span className="text-xs font-medium text-zinc-500 group-hover:text-zinc-300 transition-colors">{btn.label}</span>
          </button>
        ))}
      </div>

      {/* Tokens List */}
      <div className="flex-1 bg-zinc-900/30 border-t border-zinc-900 flex flex-col">
        <div className="px-6 py-4 flex items-center justify-between sticky top-0 bg-zinc-950/95 backdrop-blur-sm z-10">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Assets</h3>
          <button className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-600 hover:text-zinc-300 transition-colors">
            <MagnifyingGlassIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2 custom-scrollbar">
          {/* ETH */}
          <div className="group flex items-center justify-between p-3 rounded-xl hover:bg-zinc-900/80 border border-transparent hover:border-zinc-800 transition-all cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
                <span className="text-lg">Ξ</span>
              </div>
              <div>
                <div className="font-semibold text-sm text-zinc-200">Ethereum</div>
                <div className="text-xs text-zinc-500">{balance.eth} ETH</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-medium text-sm text-zinc-200">${balance.usd}</div>
              <div className="text-xs text-emerald-500 flex items-center justify-end gap-0.5">
                <span>+0.40%</span>
              </div>
            </div>
          </div>

          {/* BTC */}
          <div className="group flex items-center justify-between p-3 rounded-xl hover:bg-zinc-900/80 border border-transparent hover:border-zinc-800 transition-all cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#f7931a]/10 flex items-center justify-center border border-[#f7931a]/20">
                <span className="text-lg text-[#f7931a]">₿</span>
              </div>
              <div>
                <div className="font-semibold text-sm text-zinc-200">Bitcoin</div>
                <div className="text-xs text-zinc-500">0.00125 BTC</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-medium text-sm text-zinc-200">${(0.00125 * cryptoPrices.BTC).toFixed(2)}</div>
              <div className="text-xs text-emerald-500">+2.15%</div>
            </div>
          </div>

          {/* USDC */}
          <div className="group flex items-center justify-between p-3 rounded-xl hover:bg-zinc-900/80 border border-transparent hover:border-zinc-800 transition-all cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#2775ca]/10 flex items-center justify-center border border-[#2775ca]/20">
                <span className="text-lg text-[#2775ca]">$</span>
              </div>
              <div>
                <div className="font-semibold text-sm text-zinc-200">USDC</div>
                <div className="text-xs text-zinc-500">250.00 USDC</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-medium text-sm text-zinc-200">${(250 * cryptoPrices.USDC).toFixed(2)}</div>
              <div className="text-xs text-emerald-500">+0.01%</div>
            </div>
          </div>

          {/* Gas */}
          <div className="mt-4 pt-4 border-t border-zinc-800/50">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <FireIcon className="w-3.5 h-3.5 text-orange-500" />
                <span>Gas Price</span>
              </div>
              <span className="text-xs font-medium text-zinc-400">{gasPrice}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Nav */}
      <div className="h-16 bg-zinc-950 border-t border-zinc-900 flex items-center justify-around px-2">
        <button className="flex flex-col items-center gap-1 p-2 rounded-lg text-violet-500">
          <div className="w-10 h-8 flex items-center justify-center rounded-full bg-violet-500/10">
            <span className="text-lg">🏠</span>
          </div>
          <span className="text-[10px] font-medium">Home</span>
        </button>
        <button
          onClick={handleBiometricAuth}
          className="flex flex-col items-center gap-1 p-2 rounded-lg text-zinc-600 hover:text-zinc-300 transition-colors"
        >
          <div className="w-10 h-8 flex items-center justify-center">
            <FingerPrintIcon className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-medium">Settings</span>
        </button>
      </div>
    </div>
  )
}

export default App

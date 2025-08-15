import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from './ui/badge';
import { 
  PaperAirplaneIcon,
  QrCodeIcon,
  ArrowDownTrayIcon,
  ClipboardIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowUpRightIcon,
  ArrowDownLeftIcon,
  FingerPrintIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { EtherscanService } from '@/services/etherscan';
import { BlurFade } from '@/components/ui/blur-fade';

interface WalletDashboardProps {
  address: string;
  onLogout: () => void;
}

interface Transaction {
  hash: string;
  type: 'sent' | 'received';
  amount: string;
  date: string;
  status: 'success' | 'failed';
}

interface Balance {
  eth: string;
  usd: string;
}

export function WalletDashboard({ address, onLogout }: WalletDashboardProps) {
  const [copied, setCopied] = useState(false);
  const [balance, setBalance] = useState<Balance>({ eth: '0.000000', usd: '0.00' });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const copyAddress = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fetchWalletData = async () => {
    try {
      const [balanceData, transactionData] = await Promise.all([
        EtherscanService.getBalance(address),
        EtherscanService.getTransactions(address, 3)
      ]);
      
      setBalance(balanceData);
      setTransactions(transactionData);
    } catch (error) {
      console.error('Error fetching wallet data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchWalletData();
  };

  useEffect(() => {
    fetchWalletData();
  }, [address]);

  if (loading) {
    return (
      <div className="extension-dashboard">
        <div className="flex items-center justify-center h-full">
          <ArrowPathIcon className="w-6 h-6 animate-spin" />
          <span className="ml-2 text-sm">Loading wallet data...</span>
        </div>
      </div>
    );
  }

  return (
    <BlurFade delay={0.1} inView>
      <div className="extension-dashboard">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <FingerPrintIcon className="w-5 h-5" />
            <span className="font-semibold text-sm">Verox Wallet</span>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="h-8 w-8 p-0"
            >
              <ArrowPathIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              className="text-xs px-2 py-1 h-7"
            >
              Lock
            </Button>
          </div>
        </div>

        {/* Balance Card */}
        <Card className="mb-4">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold mb-1">{balance.eth} ETH</div>
            <div className="text-sm text-muted-foreground">${balance.usd} USD</div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <Button variant="outline" size="sm" className="flex flex-col h-16 p-2">
            <PaperAirplaneIcon className="w-4 h-4 mb-1" />
            <span className="text-xs">Send</span>
          </Button>
          <Button variant="outline" size="sm" className="flex flex-col h-16 p-2">
            <ArrowDownTrayIcon className="w-4 h-4 mb-1" />
            <span className="text-xs">Receive</span>
          </Button>
          <Button variant="outline" size="sm" className="flex flex-col h-16 p-2">
            <QrCodeIcon className="w-4 h-4 mb-1" />
            <span className="text-xs">QR Code</span>
          </Button>
        </div>

        {/* Address */}
        <Card className="mb-4">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground mb-1">Wallet Address</div>
                <div className="font-mono text-xs truncate">{address}</div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyAddress}
                className="h-8 w-8 ml-2 p-0"
              >
                {copied ? (
                  <CheckCircleIcon className="w-4 h-4 text-green-500" />
                ) : (
                  <ClipboardIcon className="w-4 h-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Recent Activity</h3>
            {transactions.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {transactions.length === 0 ? (
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-sm text-muted-foreground">No recent transactions</div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx, index) => (
                <BlurFade key={tx.hash} delay={0.2 + index * 0.1} inView>
                  <Card>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-full ${
                            tx.type === 'sent' 
                              ? 'bg-red-50 text-red-600' 
                              : 'bg-green-50 text-green-600'
                          }`}>
                            {tx.type === 'sent' ? (
                              <ArrowUpRightIcon className="w-3 h-3" />
                            ) : (
                              <ArrowDownLeftIcon className="w-3 h-3" />
                            )}
                          </div>
                          <div>
                            <div className="text-xs font-medium capitalize">
                              {tx.type}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {tx.date}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-medium">
                            {tx.type === 'sent' ? '-' : '+'}{tx.amount} ETH
                          </div>
                          <Badge 
                            variant={tx.status === 'success' ? 'default' : 'destructive'}
                            className="text-xs h-4"
                          >
                            {tx.status === 'success' ? (
                              <CheckCircleIcon className="w-2 h-2 mr-1" />
                            ) : (
                              <XCircleIcon className="w-2 h-2 mr-1" />
                            )}
                            {tx.status}
                          </Badge>
                        </div>
                      </div>
                      <Separator className="my-2" />
                      <div className="text-xs font-mono text-muted-foreground truncate">
                        {tx.hash}
                      </div>
                    </CardContent>
                  </Card>
                </BlurFade>
              ))}
            </div>
          )}
        </div>
      </div>
    </BlurFade>
  );
}

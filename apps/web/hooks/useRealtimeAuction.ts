import { useCallback, useEffect, useRef, useState } from 'react';
import { Socket, io } from 'socket.io-client';

export interface AuctionBid {
  bidId: string;
  auctionId: string;
  bidderId: string;
  bidderName: string;
  amount: number;
  timestamp: number;
  currentPrice: number;
  totalBids: number;
}

export interface AuctionData {
  id: string;
  title: string;
  currentPrice: number;
  startingPrice: number;
  endTime: number;
  status: 'UPCOMING' | 'ACTIVE' | 'ENDED';
  totalBids: number;
  participantsCount: number;
}

interface UseRealtimeAuctionState {
  connected: boolean;
  authenticated: boolean;
  joined: boolean;
  auction: AuctionData | null;
  recentBids: AuctionBid[];
  participantsCount: number;
  timeRemaining: number;
  isPlacingBid: boolean;
  error: string | null;
}

export function useRealtimeAuction(auctionId: string, userToken: string) {
  const socketRef = useRef<Socket | null>(null);
  const [state, setState] = useState<UseRealtimeAuctionState>({
    connected: false,
    authenticated: false,
    joined: false,
    auction: null,
    recentBids: [],
    participantsCount: 0,
    timeRemaining: 0,
    isPlacingBid: false,
    error: null,
  });

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    const socket = io({
      transports: ['websocket', 'polling'],
      timeout: 20000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setState((prev) => ({ ...prev, connected: true, error: null }));
      // المصادقة فور الاتصال
      socket.emit('authenticate', userToken);
    });

    socket.on('authenticated', (data) => {
      setState((prev) => ({ ...prev, authenticated: true }));
    });

    socket.on('auth_failed', (data) => {
      setState((prev) => ({
        ...prev,
        error: data.message,
        authenticated: false,
      }));
    });

    socket.on('auction_joined', (auction: AuctionData) => {
      setState((prev) => ({
        ...prev,
        joined: true,
        auction,
        participantsCount: auction.participantsCount,
      }));
    });

    socket.on('new_bid', (bid: AuctionBid) => {
      setState((prev) => ({
        ...prev,
        recentBids: [bid, ...prev.recentBids.slice(0, 19)],
        auction: prev.auction
          ? {
            ...prev.auction,
            currentPrice: bid.currentPrice,
            totalBids: bid.totalBids,
          }
          : null,
      }));
    });

    socket.on('participant_joined', (data) => {
      setState((prev) => ({
        ...prev,
        participantsCount: data.participantsCount,
      }));
    });

    socket.on('participant_left', (data) => {
      setState((prev) => ({
        ...prev,
        participantsCount: Math.max(0, prev.participantsCount - 1),
      }));
    });

    socket.on('auction_ended', (data) => {
      setState((prev) => ({
        ...prev,
        auction: prev.auction
          ? {
            ...prev.auction,
            status: 'ENDED',
          }
          : null,
        timeRemaining: 0,
      }));
    });

    socket.on('bid_failed', (data) => {
      setState((prev) => ({
        ...prev,
        isPlacingBid: false,
        error: data.message,
      }));
    });

    socket.on('error', (data) => {
      setState((prev) => ({ ...prev, error: data.message }));
    });

    socket.on('disconnect', () => {
      setState((prev) => ({
        ...prev,
        connected: false,
        authenticated: false,
        joined: false,
      }));
    });
  }, [userToken]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setState((prev) => ({
      ...prev,
      connected: false,
      authenticated: false,
      joined: false,
    }));
  }, []);

  const joinAuction = useCallback(() => {
    if (socketRef.current?.connected && state.authenticated) {
      socketRef.current.emit('join_auction', auctionId);
    }
  }, [auctionId, state.authenticated]);

  const placeBid = useCallback(
    (amount: number) => {
      if (!socketRef.current?.connected || !state.joined || state.isPlacingBid) {
        return Promise.resolve({
          success: false,
          error: 'غير متصل أو يتم تقديم عطاء آخر',
        });
      }

      setState((prev) => ({ ...prev, isPlacingBid: true, error: null }));

      return new Promise<{ success: boolean; error?: string; }>((resolve) => {
        const timeout = setTimeout(() => {
          setState((prev) => ({ ...prev, isPlacingBid: false }));
          resolve({ success: false, error: 'انتهت مهلة الاستجابة' });
        }, 10000);

        const handleBidSuccess = (bid: AuctionBid) => {
          clearTimeout(timeout);
          setState((prev) => ({ ...prev, isPlacingBid: false }));
          socketRef.current?.off('new_bid', handleBidSuccess);
          socketRef.current?.off('bid_failed', handleBidFailure);
          resolve({ success: true });
        };

        const handleBidFailure = (data: { message: string; }) => {
          clearTimeout(timeout);
          setState((prev) => ({
            ...prev,
            isPlacingBid: false,
            error: data.message,
          }));
          socketRef.current?.off('new_bid', handleBidSuccess);
          socketRef.current?.off('bid_failed', handleBidFailure);
          resolve({ success: false, error: data.message });
        };

        socketRef.current?.on('new_bid', handleBidSuccess);
        socketRef.current?.on('bid_failed', handleBidFailure);
        socketRef.current?.emit('place_bid', { auctionId, amount });
      });
    },
    [auctionId, state.joined, state.isPlacingBid],
  );

  // تحديث الوقت المتبقي
  useEffect(() => {
    if (!state.auction || state.auction.status !== 'ACTIVE') return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, state.auction!.endTime - Date.now());
      setState((prev) => ({ ...prev, timeRemaining: remaining }));

      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [state.auction]);

  // تنظيف عند unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    ...state,
    connect,
    disconnect,
    joinAuction,
    placeBid,
    clearError: () => setState((prev) => ({ ...prev, error: null })),
  };
}

import { NextResponse } from 'next/server';
import { SessionValidation } from '@/lib/sessionvalidation';
import { prisma } from "@/lib/prisma";
import { ProcessStatus, NotificationStatus } from "@/constants/enums";

interface DateCount {
  [key: string]: { date: string; count: number };
}

export async function GET(request: Request) {

  const auth = await SessionValidation();
    
  if (!auth) {
    return NextResponse.json(
      { error: "Unauthorized" }, 
      { status: 401 }
    );
  }
  
  // Parse the URL to get query parameters
  const url = new URL(request.url);
  const timeRange = url.searchParams.get('timeRange') || 'week';
  
  // Calculate the start date based on time range
  const startDate = getStartDate(timeRange);
  
  try {
    // Fetch users data
    const users = await getUsersData(startDate);
    
    // Fetch transfer accounts data
    const transferAccounts = await getTransferAccountsData(startDate);
    
    // Fetch players data
    const players = await getPlayersData(startDate);
    
    // Fetch processes data
    const processes = await getProcessesData(startDate);
    
    // Fetch notifications data
    const notifications = await getNotificationsData(startDate);
    
    // Fetch active processes
    const activeProcesses = await getActiveProcesses();
    
    return NextResponse.json({
      data: {
        users,
        transferAccounts,
        players,
        processes,
        notifications,
        activeProcesses
      },
      success: true,
      message: "Dashboard data fetched successfully"
    }, 
    { status: 200 });
    
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}

// Helper function to get start date based on time range
function getStartDate(timeRange: string): Date {
  const now = new Date();
  let startDate = new Date();
  
  switch (timeRange) {
    case 'week':
      startDate.setDate(now.getDate() - 7);
      break;
    case 'month':
      startDate.setMonth(now.getMonth() - 1);
      break;
    case 'year':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    case 'five_years':
      startDate.setFullYear(now.getFullYear() - 5);
      break;
    default:
      startDate.setDate(now.getDate() - 7); // Default to last week
  }
  
  return startDate;
}

// Get users data with date aggregation
async function getUsersData(startDate: Date) {
  // Get all users created since startDate
  const users = await prisma.user.findMany({
    where: {
      updated_at: {
        gte: startDate
      }
    },
    orderBy: {
      updated_at: 'asc'
    }
  });
  
  interface DateCount {
    [key: string]: { date: string; count: number };
  }
   
  // Group users by date for chart visualization
  const usersByDate = users.reduce<DateCount>((acc, user) => {
    const date = user.updated_at.toISOString().split('T')[0];
    
    if (!acc[date]) {
      acc[date] = { date, count: 0 };
    }
    
    acc[date].count += 1;
    return acc;
  }, {});
  return Object.values(usersByDate);
}

// Get transfer accounts data with date aggregation
async function getTransferAccountsData(startDate: Date) {
  const accounts = await prisma.transferAccount.findMany({
    where: {
      created_at: {
        gte: startDate
      }
    },
    orderBy: {
      created_at: 'asc'
    }
  });
  
  const accountsByDate = accounts.reduce<DateCount>((acc, account) => {
    const date = account.created_at.toISOString().split('T')[0];
    
    if (!acc[date]) {
      acc[date] = { date, count: 0 };
    }
    
    acc[date].count += 1;
    return acc;
  }, {});
  
  // If no accounts, provide default empty data point
  if (Object.keys(accountsByDate).length === 0) {
    return [{ date: new Date().toISOString().split('T')[0], count: 0 }];
  }
  
  return Object.values(accountsByDate);
}

// Get players data with date aggregation
async function getPlayersData(startDate: Date) {
  const players = await prisma.player.findMany({
    where: {
      created_at: {
        gte: startDate
      }
    },
    orderBy: {
      created_at: 'asc'
    }
  });
  
  const playersByDate = players.reduce<DateCount>((acc, player) => {
    const date = player.created_at.toISOString().split('T')[0];
    
    if (!acc[date]) {
      acc[date] = { date, count: 0 };
    }
    
    acc[date].count += 1;
    return acc;
  }, {});
  
  // If no players, provide default empty data point
  if (Object.keys(playersByDate).length === 0) {
    return [{ date: new Date().toISOString().split('T')[0], count: 0 }];
  }
  
  return Object.values(playersByDate);
}

// Get processes data with status distribution
async function getProcessesData(startDate: Date) {
  try {
    const processes = await prisma.userProcess.findMany({
      where: {
        created_at: {
          gte: startDate
        },
        status: {
          in: [ProcessStatus.COMPLETED, ProcessStatus.FAILED]
        }
      },
      select: {
        id: true,
        status: true,
        created_at: true
      },
      orderBy: {
        created_at: 'asc'
      }
    });
    
    return processes;
  } catch (error) {
    console.error("Error fetching process data:", error);
    return [];
  }
}

// Get notifications data with status distribution
async function getNotificationsData(startDate: Date) {
  try {
    const notifications = await prisma.notification.findMany({
      where: {
        createdAt: {
          gte: startDate
        }
      },
      select: {
        id: true,
        status: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
    
    return notifications;
  } catch (error) {
    console.error("Error fetching notification data:", error);
    return [];
  }
}

async function getActiveProcesses() {
  try {
    const processes = await prisma.userProcess.findMany({
      where: {
        status: {
          in: [ProcessStatus.PENDING, ProcessStatus.PROCESSING]
        }
      },
      select: {
        id: true,
        user_id: true,
        status: true,
        created_at: true,
        // Include related transfer accounts
        transferAccounts: {
          select: {
            id: true,
            username: true,
            status: true,
            progress: true,
            type: true,
            updated_at: true
          }
        },
        // Include related agent accounts
        agent_account: {
          select: {
            id: true,
            username: true,
            status: true,
            progress: true,
            updated_at: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      },
      take: 5 // Limit to 5 most recent active processes
    });
    
    // Calculate overall progress for each process based on related accounts
    const processesWithProgress = processes.map(process => {
      // Calculate progress based on transfer accounts
      const transferAccountsCount = process.transferAccounts.length;
      const transferAccountsProgress = transferAccountsCount > 0 
        ? process.transferAccounts.reduce((sum, account) => sum + (account.progress || 0), 0) / transferAccountsCount
        : 0;
      
      // Calculate progress based on agent accounts
      const agentAccountsCount = process.agent_account.length;
      const agentAccountsProgress = agentAccountsCount > 0
        ? process.agent_account.reduce((sum, account) => sum + (account.progress || 0), 0) / agentAccountsCount
        : 0;
      
      // Calculate overall progress (average of transfer and agent accounts)
      const totalAccountsCount = transferAccountsCount + agentAccountsCount;
      const overallProgress = totalAccountsCount > 0
        ? Math.round((transferAccountsProgress * transferAccountsCount + agentAccountsProgress * agentAccountsCount) / totalAccountsCount)
        : 0;
      
      return {
        ...process,
        progress: overallProgress
      };
    });
    
    return processesWithProgress;
  } catch (error) {
    console.error("Error fetching active processes:", error);
    return [];
  }
}
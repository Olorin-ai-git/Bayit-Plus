import React, { useState, useEffect } from 'react';
import {
<<<<<<< HEAD
  UserGroupIcon,
=======
>>>>>>> 001-modify-analyzer-method
  UserPlusIcon,
  ChatBubbleLeftIcon,
  PaperAirplaneIcon,
  BellIcon,
  EyeIcon,
  PencilIcon,
  CheckCircleIcon,
<<<<<<< HEAD
  ExclamationTriangleIcon,
=======
>>>>>>> 001-modify-analyzer-method
  ClockIcon,
  UserIcon,
  CalendarIcon,
  TagIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'lead_investigator' | 'investigator' | 'analyst' | 'reviewer' | 'viewer';
  avatar?: string;
  status: 'online' | 'offline' | 'away';
  lastActive: string;
  permissions: string[];
}

interface Comment {
  id: string;
  author: TeamMember;
  content: string;
  timestamp: string;
  type: 'comment' | 'status_update' | 'assignment' | 'mention';
  attachments?: string[];
  mentions?: string[];
  edited?: boolean;
  editedAt?: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: TeamMember;
  createdBy: TeamMember;
  status: 'todo' | 'in_progress' | 'review' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  createdAt: string;
  completedAt?: string;
  tags: string[];
}

interface CollaborationPanelProps {
  investigationId?: string;
  className?: string;
  onActivityUpdate?: (activity: any) => void;
}

const CollaborationPanel: React.FC<CollaborationPanelProps> = ({
  investigationId = 'inv-001',
  className = "",
  onActivityUpdate
}) => {
  const [activeTab, setActiveTab] = useState<'team' | 'comments' | 'tasks'>('comments');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newComment, setNewComment] = useState('');
<<<<<<< HEAD
  const [isLoading, setIsLoading] = useState(false);

  // Mock data for demonstration
=======

  // Initialize collaboration data on component mount
>>>>>>> 001-modify-analyzer-method
  useEffect(() => {
    const mockTeamMembers: TeamMember[] = [
      {
        id: 'user-1',
        name: 'Sarah Chen',
        email: 'sarah.chen@company.com',
        role: 'lead_investigator',
        status: 'online',
        lastActive: new Date().toISOString(),
        permissions: ['read', 'write', 'admin', 'assign_tasks']
      },
      {
        id: 'user-2',
        name: 'Mike Rodriguez',
        email: 'mike.rodriguez@company.com',
        role: 'investigator',
        status: 'online',
        lastActive: new Date(Date.now() - 300000).toISOString(),
        permissions: ['read', 'write', 'comment']
      },
      {
        id: 'user-3',
        name: 'Emily Watson',
        email: 'emily.watson@company.com',
        role: 'analyst',
        status: 'away',
        lastActive: new Date(Date.now() - 1800000).toISOString(),
        permissions: ['read', 'comment']
      },
      {
        id: 'user-4',
        name: 'David Park',
        email: 'david.park@company.com',
        role: 'reviewer',
        status: 'offline',
        lastActive: new Date(Date.now() - 7200000).toISOString(),
        permissions: ['read', 'review']
      }
    ];

    const mockComments: Comment[] = [
      {
        id: 'comment-1',
        author: mockTeamMembers[0],
        content: 'Starting investigation on suspicious transaction patterns. Initial data shows potential fraud indicators.',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        type: 'status_update'
      },
      {
        id: 'comment-2',
        author: mockTeamMembers[1],
        content: 'Found additional evidence in the device fingerprint analysis. @Emily Watson can you review the technical details?',
        timestamp: new Date(Date.now() - 2700000).toISOString(),
        type: 'mention',
        mentions: ['user-3']
      },
      {
        id: 'comment-3',
        author: mockTeamMembers[2],
        content: 'Device analysis shows multiple high-risk indicators. Flagged for immediate review.',
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        type: 'comment'
      },
      {
        id: 'comment-4',
        author: mockTeamMembers[0],
        content: 'Task assigned to Mike: Complete network analysis by end of day.',
        timestamp: new Date(Date.now() - 900000).toISOString(),
        type: 'assignment'
      }
    ];

    const mockTasks: Task[] = [
      {
        id: 'task-1',
        title: 'Complete Device Fingerprint Analysis',
        description: 'Analyze device signatures and identify anomalies',
        assignedTo: mockTeamMembers[2],
        createdBy: mockTeamMembers[0],
        status: 'completed',
        priority: 'high',
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        completedAt: new Date(Date.now() - 1800000).toISOString(),
        tags: ['analysis', 'device', 'high-priority']
      },
      {
        id: 'task-2',
        title: 'Network Traffic Analysis',
        description: 'Review network patterns and identify suspicious connections',
        assignedTo: mockTeamMembers[1],
        createdBy: mockTeamMembers[0],
        status: 'in_progress',
        priority: 'high',
        dueDate: new Date(Date.now() + 86400000).toISOString(),
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        tags: ['network', 'analysis', 'urgent']
      },
      {
        id: 'task-3',
        title: 'Generate Investigation Report',
        description: 'Compile findings into comprehensive investigation report',
        assignedTo: mockTeamMembers[0],
        createdBy: mockTeamMembers[3],
        status: 'todo',
        priority: 'medium',
        dueDate: new Date(Date.now() + 172800000).toISOString(),
        createdAt: new Date(Date.now() - 1800000).toISOString(),
        tags: ['reporting', 'documentation']
      }
    ];

    setTeamMembers(mockTeamMembers);
    setComments(mockComments);
    setTasks(mockTasks);
  }, []);

  const getStatusIcon = (status: TeamMember['status']) => {
    switch (status) {
      case 'online':
        return <div className="w-3 h-3 bg-green-500 rounded-full" />;
      case 'away':
        return <div className="w-3 h-3 bg-yellow-500 rounded-full" />;
      default:
        return <div className="w-3 h-3 bg-gray-400 rounded-full" />;
    }
  };

  const getRoleColor = (role: TeamMember['role']) => {
    switch (role) {
      case 'lead_investigator':
        return 'bg-purple-100 text-purple-800';
      case 'investigator':
        return 'bg-blue-100 text-blue-800';
      case 'analyst':
        return 'bg-green-100 text-green-800';
      case 'reviewer':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTaskStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <ArrowPathIcon className="h-4 w-4 text-blue-500" />;
      case 'review':
        return <EyeIcon className="h-4 w-4 text-yellow-500" />;
      default:
        return <ClockIcon className="h-4 w-4 text-gray-400" />;
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-green-100 text-green-800';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  const handleSendComment = () => {
    if (!newComment.trim()) return;

    const currentUser = teamMembers[0]; // Assuming current user is first member
    const comment: Comment = {
      id: `comment-${Date.now()}`,
      author: currentUser,
      content: newComment,
      timestamp: new Date().toISOString(),
      type: 'comment'
    };

    setComments(prev => [comment, ...prev]);
    setNewComment('');

    if (onActivityUpdate) {
      onActivityUpdate({ type: 'comment', data: comment });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendComment();
    }
  };

  const completedTasks = tasks.filter(task => task.status === 'completed').length;
  const inProgressTasks = tasks.filter(task => task.status === 'in_progress').length;

  return (
    <div className={`collaboration-panel bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Collaboration</h3>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">{teamMembers.length} members</span>
            <BellIcon className="h-5 w-5 text-gray-400" />
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-4 flex space-x-6">
          {[
            { id: 'comments', label: 'Comments', count: comments.length },
            { id: 'team', label: 'Team', count: teamMembers.length },
            { id: 'tasks', label: 'Tasks', count: tasks.length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-2 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'comments' && (
          <div className="space-y-4">
            {/* New Comment Input */}
            <div className="flex space-x-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <UserIcon className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Add a comment..."
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows={3}
                />
                <div className="mt-2 flex justify-between items-center">
                  <span className="text-xs text-gray-500">Press Enter to send, Shift+Enter for new line</span>
                  <button
                    onClick={handleSendComment}
                    disabled={!newComment.trim()}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <PaperAirplaneIcon className="h-4 w-4 mr-1" />
                    Send
                  </button>
                </div>
              </div>
            </div>

            {/* Comments List */}
            <div className="space-y-4">
              {comments.map(comment => (
                <div key={comment.id} className="flex space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                      <UserIcon className="h-4 w-4 text-gray-600" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">{comment.author.name}</span>
                      <span className={`px-2 py-1 rounded-full text-xs ${getRoleColor(comment.author.role)}`}>
                        {comment.author.role.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-gray-500">{formatDate(comment.timestamp)}</span>
                    </div>
                    <div className="mt-1">
                      <p className="text-gray-700">{comment.content}</p>
                      {comment.type === 'mention' && (
                        <div className="mt-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                          💬 Mentioned team members
                        </div>
                      )}
                      {comment.type === 'assignment' && (
                        <div className="mt-2 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                          📋 Task assignment
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'team' && (
          <div className="space-y-4">
            {/* Add Member Button */}
            <button className="w-full flex items-center justify-center px-4 py-2 border border-dashed border-gray-300 rounded-md text-gray-600 hover:border-blue-300 hover:text-blue-600">
              <UserPlusIcon className="h-5 w-5 mr-2" />
              Add Team Member
            </button>

            {/* Team Members List */}
            <div className="space-y-3">
              {teamMembers.map(member => (
                <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                        <UserIcon className="h-5 w-5 text-gray-600" />
                      </div>
                      <div className="absolute -bottom-1 -right-1">
                        {getStatusIcon(member.status)}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{member.name}</h4>
                      <p className="text-sm text-gray-600">{member.email}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`px-2 py-1 rounded-full text-xs ${getRoleColor(member.role)}`}>
                          {member.role.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-gray-500">
                          Last active: {formatDate(member.lastActive)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button className="p-2 text-gray-400 hover:text-blue-600 rounded">
                      <ChatBubbleLeftIcon className="h-4 w-4" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-gray-600 rounded">
                      <PencilIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-4">
            {/* Task Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-green-700">Completed</span>
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                </div>
                <p className="text-xl font-semibold text-gray-900">{completedTasks}</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-700">In Progress</span>
                  <ArrowPathIcon className="h-5 w-5 text-blue-500" />
                </div>
                <p className="text-xl font-semibold text-gray-900">{inProgressTasks}</p>
              </div>
            </div>

            {/* Tasks List */}
            <div className="space-y-3">
              {tasks.map(task => (
                <div key={task.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        {getTaskStatusIcon(task.status)}
                        <h4 className="font-medium text-gray-900">{task.title}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center">
                          <UserIcon className="h-3 w-3 mr-1" />
                          {task.assignedTo.name}
                        </span>
                        <span className="flex items-center">
                          <CalendarIcon className="h-3 w-3 mr-1" />
                          {formatDate(task.createdAt)}
                        </span>
                        {task.dueDate && (
                          <span className="text-orange-600">
                            Due: {formatDate(task.dueDate)}
                          </span>
                        )}
                      </div>
                      {task.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {task.tags.map(tag => (
                            <span
                              key={tag}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                            >
                              <TagIcon className="h-3 w-3 mr-1" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CollaborationPanel;
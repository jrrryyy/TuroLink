import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  MessageSquare,
  Mail,
  Copy,
  Check,
  GraduationCap,
  Sparkles
} from 'lucide-react';
import api from '../services/api';
import { profilePictureUrl } from '../services/profile';
import UserProfileModal from './UserProfileModal';
import '../styles/teacher-students.css';

export default function TeacherEnrolledStudents({ subject }) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [startingChatId, setStartingChatId] = useState(null);

  const students = useMemo(() => {
    return Array.isArray(subject?.enrolledStudents) ? subject.enrolledStudents : [];
  }, [subject?.enrolledStudents]);

  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) return students;
    const term = searchTerm.toLowerCase().trim();
    return students.filter((s) => {
      const name = (s.name || '').toLowerCase();
      const email = (s.email || '').toLowerCase();
      return name.includes(term) || email.includes(term);
    });
  }, [students, searchTerm]);

  const handleCopyCode = async () => {
    if (!subject?.code) return;
    try {
      await navigator.clipboard.writeText(subject.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleMessageStudent = async (studentId) => {
    setStartingChatId(studentId);
    try {
      const res = await api.post('/messages/conversations', { recipientId: studentId });
      navigate(`/teacher/messages?conversationId=${res.data._id}`);
    } catch {
      navigate(`/teacher/messages?recipientId=${studentId}`);
    } finally {
      setStartingChatId(null);
    }
  };

  return (
    <div className="teacher-enrolled-students-wrapper">
      {/* Header Bar */}
      <div className="enrolled-students-header">
        <div className="enrolled-students-header-left">
          <div className="enrolled-students-icon-wrap">
            <GraduationCap size={22} />
          </div>
          <div>
            <h3>Enrolled Students</h3>
            <p className="enrolled-students-subtitle">
              {students.length} {students.length === 1 ? 'student' : 'students'} currently enrolled in {subject?.code}
            </p>
          </div>
        </div>

        <div className="enrolled-students-header-right">
          <div className="subject-code-share-pill" title="Students use this code to join">
            <span className="code-label">Class Code:</span>
            <strong className="code-value">{subject?.code}</strong>
            <button
              type="button"
              className="copy-code-btn"
              onClick={handleCopyCode}
              aria-label="Copy class code"
            >
              {copiedCode ? <Check size={14} className="copied" /> : <Copy size={14} />}
              <span>{copiedCode ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      {students.length > 0 && (
        <div className="enrolled-students-search-bar">
          <div className="search-input-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search by student name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search enrolled students"
            />
            {searchTerm && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchTerm('')}
              >
                Clear
              </button>
            )}
          </div>
          <span className="search-count-label">
            Showing {filteredStudents.length} of {students.length}
          </span>
        </div>
      )}

      {/* Main Content Area */}
      {students.length === 0 ? (
        <div className="enrolled-students-empty-state">
          <div className="empty-state-icon">
            <Users size={38} />
          </div>
          <h4>No Students Enrolled Yet</h4>
          <p>
            Share your subject code <strong>{subject?.code}</strong> with students. Once they enroll from their dashboard, they will appear here.
          </p>
          <button
            type="button"
            className="empty-state-copy-btn"
            onClick={handleCopyCode}
          >
            {copiedCode ? <Check size={16} /> : <Copy size={16} />}
            <span>{copiedCode ? 'Class Code Copied!' : `Copy Class Code (${subject?.code})`}</span>
          </button>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="enrolled-students-no-match">
          <p>No students match your search "<strong>{searchTerm}</strong>".</p>
          <button
            type="button"
            className="clear-filter-link"
            onClick={() => setSearchTerm('')}
          >
            Reset search
          </button>
        </div>
      ) : (
        <div className="enrolled-students-grid">
          {filteredStudents.map((student) => {
            const firstLetter = (student.name || 'S').charAt(0).toUpperCase();
            const avatarUrl = profilePictureUrl(student.profilePicture);

            return (
              <div key={student._id} className="enrolled-student-card">
                <div
                  className="student-card-info-clickable"
                  onClick={() => setSelectedStudentId(student._id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedStudentId(student._id)}
                >
                  <div className="student-avatar-wrap">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={student.name} className="student-avatar-img" />
                    ) : (
                      <div className="student-avatar-fallback">{firstLetter}</div>
                    )}
                  </div>

                  <div className="student-details">
                    <h4 className="student-name">{student.name}</h4>
                    <span className="student-email" title={student.email}>
                      <Mail size={12} />
                      <span>{student.email}</span>
                    </span>
                  </div>
                </div>

                <div className="student-card-actions">
                  <button
                    type="button"
                    className="student-action-btn message-btn"
                    disabled={startingChatId === student._id}
                    onClick={() => handleMessageStudent(student._id)}
                    title={`Send message to ${student.name}`}
                  >
                    <MessageSquare size={14} />
                    <span>{startingChatId === student._id ? 'Opening…' : 'Message'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* User Profile Modal when clicking a student */}
      {selectedStudentId && (
        <UserProfileModal
          targetId={selectedStudentId}
          onClose={() => setSelectedStudentId(null)}
          onStartConversation={(recipientId) => {
            setSelectedStudentId(null);
            handleMessageStudent(recipientId);
          }}
        />
      )}
    </div>
  );
}

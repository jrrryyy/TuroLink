import { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown, Check, Users, Search, User } from 'lucide-react';
import '../styles/student-recipient-picker.css';

export default function StudentRecipientPicker({
  enrolledStudents = [],
  value = [],
  onChange,
  disabled = false,
  ariaLabel = 'Recipients',
  compact = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const listId = useId();

  // Normalize students array
  const students = (enrolledStudents || []).map((s) => {
    if (typeof s === 'string') return { _id: s, name: 'Student', email: '' };
    return {
      _id: String(s._id || s),
      name: s.name || 'Student',
      email: s.email || '',
      profilePicture: s.profilePicture || '',
    };
  });

  // A value of [] (empty array) strictly represents "All Students" (broadcast mode).
  // A non-empty array e.g. [studentId] represents specific selected student(s),
  // even if there is only 1 student currently enrolled.
  const isAllSelected = !value || value.length === 0;

  // In All Students mode, all enrolled students are included.
  // In specific mode, only students in value array are included.
  const selectedSet = new Set(
    isAllSelected ? students.map((s) => s._id) : (Array.isArray(value) ? value.map(String) : [])
  );

  // Close on click outside or Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const toggleAll = () => {
    if (isAllSelected) {
      // Teacher wants to turn off "All Students" broadcast mode.
      // If there's only 1 student, switch to specifically selecting that 1 student.
      // If there are multiple, keep all currently selected as specific IDs so they can deselect one.
      if (students.length === 1) {
        onChange([students[0]._id]);
      } else {
        onChange(students.map((s) => s._id));
      }
    } else {
      // Switch back to "All Students" broadcast mode
      onChange([]);
    }
  };

  const toggleStudent = (studentId) => {
    if (isAllSelected) {
      // In All Students mode:
      if (students.length === 1) {
        // Only 1 student enrolled: clicking that student switches from "All Students" to specific student!
        onChange([studentId]);
      } else {
        // Multiple students: clicking a student excludes them, making the rest specific students
        const nextSelected = students.filter((s) => s._id !== studentId).map((s) => s._id);
        onChange(nextSelected);
      }
      return;
    }

    // In Specific Students mode:
    let nextSelected;
    if (selectedSet.has(studentId)) {
      nextSelected = (value || []).filter((id) => String(id) !== String(studentId));
    } else {
      nextSelected = [...(value || []), studentId];
    }

    // Keep the specific student IDs (do NOT force to [] even if count matches students.length)
    onChange(nextSelected);
  };

  const selectOnlyStudent = (studentId, event) => {
    event.stopPropagation();
    onChange([studentId]);
  };

  // Label to display on the trigger button
  const getDisplayLabel = () => {
    if (students.length === 0) return 'No students enrolled';
    if (isAllSelected) {
      return `All Students (${students.length})`;
    }
    if (value.length === 1) {
      const found = students.find((s) => s._id === String(value[0]));
      return found?.name || '1 Student';
    }
    if (value.length === 0) {
      return 'No students selected';
    }
    return `${value.length} Students`;
  };

  const filteredStudents = students.filter((s) => {
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    return s.name.toLowerCase().includes(query) || s.email.toLowerCase().includes(query);
  });

  return (
    <div
      className={`student-recipient-picker ${compact ? 'compact' : ''} ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''} ${!isAllSelected ? 'specific-active' : ''}`}
      ref={containerRef}
    >
      <button
        type="button"
        className={`recipient-picker-trigger ${!isAllSelected ? 'is-specific' : ''}`}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        id={`recipient-trigger-${listId}`}
      >
        <span className="recipient-picker-label">
          {!isAllSelected && value.length === 1 ? (
            <User size={14} className="recipient-picker-icon specific-icon" />
          ) : (
            <Users size={14} className="recipient-picker-icon" />
          )}
          <span className="recipient-picker-text">{getDisplayLabel()}</span>
        </span>
        <ChevronDown size={15} className={`recipient-picker-chevron ${isOpen ? 'rotated' : ''}`} />
      </button>

      {isOpen && (
        <div className="recipient-picker-popover" role="dialog" aria-label="Select student recipients">
          <div className="recipient-picker-header">
            <span className="recipient-picker-title">Audience</span>
            {students.length > 0 && (
              <span className="recipient-picker-count">
                {isAllSelected ? `All (${students.length})` : `${value.length} of ${students.length}`}
              </span>
            )}
          </div>

          {students.length > 5 && (
            <div className="recipient-picker-search">
              <Search size={13} />
              <input
                type="text"
                placeholder="Filter students..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>
          )}

          <div className="recipient-picker-list" role="listbox" aria-multiselectable="true">
            {/* All Students master row */}
            <div
              className={`recipient-item master-item ${isAllSelected ? 'selected' : ''}`}
              role="option"
              aria-selected={isAllSelected}
              tabIndex={0}
              onClick={toggleAll}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault();
                  toggleAll();
                }
              }}
            >
              <div className="recipient-checkbox">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={toggleAll}
                  aria-label="All students"
                  tabIndex={-1}
                />
              </div>
              <div className="recipient-avatar all-avatar">
                <Users size={14} />
              </div>
              <div className="recipient-info">
                <span className="recipient-name">All Students</span>
                <span className="recipient-meta">{students.length} enrolled student{students.length === 1 ? '' : 's'} (broadcast)</span>
              </div>
            </div>

            <div className="recipient-divider" />

            {/* Individual students */}
            {filteredStudents.length === 0 ? (
              <div className="recipient-empty">No matching students found</div>
            ) : (
              filteredStudents.map((student) => {
                // In All Students mode, student is included in broadcast.
                // In Specific Students mode, student is included only if in selectedSet.
                const isChecked = selectedSet.has(student._id);
                return (
                  <div
                    key={student._id}
                    className={`recipient-item ${isChecked ? 'selected' : ''} ${!isAllSelected && isChecked ? 'specific-selected' : ''}`}
                    role="option"
                    aria-selected={isChecked}
                    tabIndex={0}
                    onClick={() => toggleStudent(student._id)}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        toggleStudent(student._id);
                      }
                    }}
                  >
                    <div className="recipient-checkbox">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleStudent(student._id)}
                        aria-label={student.name}
                        tabIndex={-1}
                      />
                    </div>
                    <div className="recipient-avatar">
                      {student.profilePicture ? (
                        <img src={student.profilePicture} alt={student.name} />
                      ) : (
                        <span>{student.name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="recipient-info">
                      <span className="recipient-name">{student.name}</span>
                      {student.email && <span className="recipient-meta">{student.email}</span>}
                    </div>
                    <button
                      type="button"
                      className="recipient-only-btn"
                      title={`Select only ${student.name}`}
                      onClick={(e) => selectOnlyStudent(student._id, e)}
                    >
                      Only
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <div className="recipient-picker-footer">
            <button
              type="button"
              className="recipient-picker-done"
              onClick={() => setIsOpen(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

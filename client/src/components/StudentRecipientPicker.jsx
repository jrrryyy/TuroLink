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

  // An empty value array [] means ALL students are selected.
  const isAllSelected = value.length === 0 || (students.length > 0 && value.length === students.length);
  const selectedSet = new Set(
    isAllSelected ? students.map((s) => s._id) : value.map(String)
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
    onChange([]);
  };

  const toggleStudent = (studentId) => {
    let nextSelected;
    if (isAllSelected) {
      // If currently all selected and user clicks one student, that student is now excluded
      nextSelected = students.filter((s) => s._id !== studentId).map((s) => s._id);
    } else if (selectedSet.has(studentId)) {
      nextSelected = value.filter((id) => String(id) !== studentId);
    } else {
      nextSelected = [...value, studentId];
    }

    // If all students ended up selected, reset to [] (canonical representation for All Students)
    if (nextSelected.length >= students.length) {
      onChange([]);
    } else {
      onChange(nextSelected);
    }
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
    return `${value.length} Students`;
  };

  const filteredStudents = students.filter((s) => {
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    return s.name.toLowerCase().includes(query) || s.email.toLowerCase().includes(query);
  });

  return (
    <div
      className={`student-recipient-picker ${compact ? 'compact' : ''} ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''}`}
      ref={containerRef}
    >
      <button
        type="button"
        className="recipient-picker-trigger"
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        id={`recipient-trigger-${listId}`}
      >
        <span className="recipient-picker-label">
          <Users size={14} className="recipient-picker-icon" />
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
                {isAllSelected ? `${students.length} of ${students.length}` : `${value.length} of ${students.length}`}
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
                <span className="recipient-meta">{students.length} enrolled student{students.length === 1 ? '' : 's'}</span>
              </div>
            </div>

            <div className="recipient-divider" />

            {/* Individual students */}
            {filteredStudents.length === 0 ? (
              <div className="recipient-empty">No matching students found</div>
            ) : (
              filteredStudents.map((student) => {
                const isSelected = selectedSet.has(student._id);
                return (
                  <div
                    key={student._id}
                    className={`recipient-item ${isSelected ? 'selected' : ''}`}
                    role="option"
                    aria-selected={isSelected}
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
                        checked={isSelected}
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

import React from 'react';
import { PASSWORD_RULES } from '../../utils/passwordPolicy';

const PasswordPolicyIndicator = ({ password = '' }) => {
  if (!password) return null;

  return (
    <div style={{
      marginTop: '8px',
      padding: '10px 12px',
      background: '#f8fafc',
      borderRadius: '6px',
      border: '1px solid #e2e8f0',
      fontSize: '13px',
    }}>
      <div style={{ fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
        Password must contain:
      </div>
      {PASSWORD_RULES.map((rule) => {
        const passed = rule.test(password);
        return (
          <div
            key={rule.key}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '2px 0',
              color: passed ? '#16a34a' : '#94a3b8',
              transition: 'color 0.2s',
            }}
          >
            <span style={{ fontSize: '14px', lineHeight: 1 }}>
              {passed ? '✓' : '○'}
            </span>
            <span>{rule.label}</span>
          </div>
        );
      })}
    </div>
  );
};

export default PasswordPolicyIndicator;

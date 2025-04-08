import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock clarity functions and environment
const mockClarity = {
  tx: {
    sender: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM', // mock address
  },
  vars: {
    'contract-admin': 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
  },
  maps: {
    'verified-renters': {},
  },
  blockHeight: 100,
};

// Mock the contract functions
const renterVerificationContract = {
  // Set admin
  setAdmin: (newAdmin) => {
    if (mockClarity.tx.sender !== mockClarity.vars['contract-admin']) {
      return { err: 403 };
    }
    
    mockClarity.vars['contract-admin'] = newAdmin;
    return { ok: true };
  },
  
  // Request verification
  requestVerification: (businessName, businessId) => {
    if (businessName.length === 0) return { err: 1 };
    if (businessId.length === 0) return { err: 2 };
    
    mockClarity.maps['verified-renters'][mockClarity.tx.sender] = {
      'business-name': businessName,
      'business-id': businessId,
      'is-verified': false,
      'verification-date': 0,
      'last-updated': mockClarity.blockHeight,
    };
    
    return { ok: true };
  },
  
  // Approve verification
  approveVerification: (renter) => {
    // Check if caller is admin
    if (mockClarity.tx.sender !== mockClarity.vars['contract-admin']) {
      return { err: 403 };
    }
    
    // Check if renter exists
    const renterData = mockClarity.maps['verified-renters'][renter];
    if (!renterData) return { err: 404 };
    
    // Update verification status
    mockClarity.maps['verified-renters'][renter] = {
      ...renterData,
      'is-verified': true,
      'verification-date': mockClarity.blockHeight,
      'last-updated': mockClarity.blockHeight,
    };
    
    return { ok: true };
  },
  
  // Revoke verification
  revokeVerification: (renter) => {
    // Check if caller is admin
    if (mockClarity.tx.sender !== mockClarity.vars['contract-admin']) {
      return { err: 403 };
    }
    
    // Check if renter exists
    const renterData = mockClarity.maps['verified-renters'][renter];
    if (!renterData) return { err: 404 };
    
    // Update verification status
    mockClarity.maps['verified-renters'][renter] = {
      ...renterData,
      'is-verified': false,
      'last-updated': mockClarity.blockHeight,
    };
    
    return { ok: true };
  },
  
  // Check if a renter is verified
  isVerified: (renter) => {
    const renterData = mockClarity.maps['verified-renters'][renter];
    return renterData ? renterData['is-verified'] : false;
  },
  
  // Get verification details
  getVerificationDetails: (renter) => {
    return mockClarity.maps['verified-renters'][renter] || null;
  },
};

describe('Renter Verification Contract', () => {
  beforeEach(() => {
    // Reset state between tests
    mockClarity.vars['contract-admin'] = mockClarity.tx.sender;
    mockClarity.maps['verified-renters'] = {};
  });
  
  it('should allow a renter to request verification', () => {
    const result = renterVerificationContract.requestVerification(
        'ABC Construction',
        'BUS12345'
    );
    
    expect(result).toEqual({ ok: true });
    
    const renterData = renterVerificationContract.getVerificationDetails(mockClarity.tx.sender);
    expect(renterData).toBeDefined();
    expect(renterData['business-name']).toBe('ABC Construction');
    expect(renterData['is-verified']).toBe(false);
  });
  
  it('should fail when business name is empty', () => {
    const result = renterVerificationContract.requestVerification('', 'BUS12345');
    expect(result).toEqual({ err: 1 });
  });
  
  it('should fail when business ID is empty', () => {
    const result = renterVerificationContract.requestVerification('ABC Construction', '');
    expect(result).toEqual({ err: 2 });
  });
  
  it('should allow admin to approve verification', () => {
    // Request verification first
    const renter = mockClarity.tx.sender;
    renterVerificationContract.requestVerification('ABC Construction', 'BUS12345');
    
    // Approve verification
    const result = renterVerificationContract.approveVerification(renter);
    expect(result).toEqual({ ok: true });
    
    // Check verification status
    expect(renterVerificationContract.isVerified(renter)).toBe(true);
    
    const renterData = renterVerificationContract.getVerificationDetails(renter);
    expect(renterData['is-verified']).toBe(true);
    expect(renterData['verification-date']).toBe(mockClarity.blockHeight);
  });
  
  it('should allow admin to revoke verification', () => {
    // Request and approve verification first
    const renter = mockClarity.tx.sender;
    renterVerificationContract.requestVerification('ABC Construction', 'BUS12345');
    renterVerificationContract.approveVerification(renter);
    
    // Revoke verification
    const result = renterVerificationContract.revokeVerification(renter);
    expect(result).toEqual({ ok: true });
    
    // Check verification status
    expect(renterVerificationContract.isVerified(renter)).toBe(false);
  });
  
  it('should fail when non-admin tries to approve verification', () => {
    // Request verification first
    const renter = 'ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTOABC';
    renterVerificationContract.requestVerification('ABC Construction', 'BUS12345');
    
    // Change sender to non-admin
    const originalSender = mockClarity.tx.sender;
    mockClarity.tx.sender = 'ST3PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTXYZ';
    
    // Try to approve verification
    const result = renterVerificationContract.approveVerification(renter);
    expect(result).toEqual({ err: 403 });
    
    // Reset sender
    mockClarity.tx.sender = originalSender;
  });
});

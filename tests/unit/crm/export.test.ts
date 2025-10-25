/**
 * CRM Export Tests
 * Tests for CRM export functionality and data integrity
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock CRM export service
class CRMExportService {
  async exportLeads(leads: any[], format: string): Promise<string> {
    switch (format) {
      case 'csv':
        return this.exportToCSV(leads);
      case 'json':
        return this.exportToJSON(leads);
      case 'xml':
        return this.exportToXML(leads);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  private exportToCSV(leads: any[]): string {
    if (leads.length === 0) return '';
    
    const headers = Object.keys(leads[0]).join(',');
    const rows = leads.map(lead => 
      Object.values(lead).map(value => 
        typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : value
      ).join(',')
    );
    
    return [headers, ...rows].join('\n');
  }

  private exportToJSON(leads: any[]): string {
    return JSON.stringify(leads, null, 2);
  }

  private exportToXML(leads: any[]): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<leads>\n';
    
    leads.forEach(lead => {
      xml += '  <lead>\n';
      Object.entries(lead).forEach(([key, value]) => {
        xml += `    <${key}>${value}</${key}>\n`;
      });
      xml += '  </lead>\n';
    });
    
    xml += '</leads>';
    return xml;
  }

  async validateExportData(leads: any[]): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    leads.forEach((lead, index) => {
      if (!lead.id) {
        errors.push(`Lead ${index + 1}: Missing ID`);
      }
      if (!lead.email || !this.isValidEmail(lead.email)) {
        errors.push(`Lead ${index + 1}: Invalid or missing email`);
      }
      if (!lead.firstName) {
        errors.push(`Lead ${index + 1}: Missing first name`);
      }
      if (!lead.lastName) {
        errors.push(`Lead ${index + 1}: Missing last name`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  async sanitizeData(leads: any[]): Promise<any[]> {
    return leads.map(lead => ({
      ...lead,
      firstName: this.sanitizeString(lead.firstName),
      lastName: this.sanitizeString(lead.lastName),
      email: lead.email?.toLowerCase().trim(),
      phone: this.sanitizePhone(lead.phone)
    }));
  }

  private sanitizeString(str: string): string {
    return str?.trim().replace(/[<>]/g, '') || '';
  }

  private sanitizePhone(phone: string): string {
    return phone?.replace(/\D/g, '') || '';
  }
}

describe('CRM Export', () => {
  let crmExportService: CRMExportService;

  beforeEach(() => {
    crmExportService = new CRMExportService();
  });

  describe('CSV Export', () => {
    it('should export leads to CSV format', async () => {
      const leads = [
        {
          id: '1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '555-1234'
        },
        {
          id: '2',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane.smith@example.com',
          phone: '555-5678'
        }
      ];

      const result = await crmExportService.exportLeads(leads, 'csv');
      
      expect(result).toContain('id,firstName,lastName,email,phone');
      expect(result).toContain('1,John,Doe,john.doe@example.com,555-1234');
      expect(result).toContain('2,Jane,Smith,jane.smith@example.com,555-5678');
    });

    it('should handle empty leads array', async () => {
      const leads: any[] = [];
      const result = await crmExportService.exportLeads(leads, 'csv');
      expect(result).toBe('');
    });

    it('should escape commas in CSV values', async () => {
      const leads = [
        {
          id: '1',
          firstName: 'John, Jr.',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '555-1234'
        }
      ];

      const result = await crmExportService.exportLeads(leads, 'csv');
      expect(result).toContain('"John, Jr."');
    });

    it('should handle special characters in CSV', async () => {
      const leads = [
        {
          id: '1',
          firstName: 'José',
          lastName: 'García-López',
          email: 'jose.garcia@example.com',
          phone: '555-1234'
        }
      ];

      const result = await crmExportService.exportLeads(leads, 'csv');
      expect(result).toContain('José');
      expect(result).toContain('García-López');
    });
  });

  describe('JSON Export', () => {
    it('should export leads to JSON format', async () => {
      const leads = [
        {
          id: '1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '555-1234'
        }
      ];

      const result = await crmExportService.exportLeads(leads, 'json');
      const parsed = JSON.parse(result);
      
      expect(parsed).toEqual(leads);
    });

    it('should handle complex data structures', async () => {
      const leads = [
        {
          id: '1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '555-1234',
          metadata: {
            source: 'website',
            campaign: 'summer2024',
            tags: ['hot', 'qualified']
          }
        }
      ];

      const result = await crmExportService.exportLeads(leads, 'json');
      const parsed = JSON.parse(result);
      
      expect(parsed[0].metadata).toEqual(leads[0].metadata);
    });
  });

  describe('XML Export', () => {
    it('should export leads to XML format', async () => {
      const leads = [
        {
          id: '1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '555-1234'
        }
      ];

      const result = await crmExportService.exportLeads(leads, 'xml');
      
      expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(result).toContain('<leads>');
      expect(result).toContain('<lead>');
      expect(result).toContain('<id>1</id>');
      expect(result).toContain('<firstName>John</firstName>');
      expect(result).toContain('</leads>');
    });

    it('should handle empty leads array in XML', async () => {
      const leads: any[] = [];
      const result = await crmExportService.exportLeads(leads, 'xml');
      
      expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(result).toContain('<leads>');
      expect(result).toContain('</leads>');
      expect(result).not.toContain('<lead>');
    });
  });

  describe('Data Validation', () => {
    it('should validate lead data correctly', async () => {
      const validLeads = [
        {
          id: '1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '555-1234'
        }
      ];

      const result = await crmExportService.validateExportData(validLeads);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should identify missing required fields', async () => {
      const invalidLeads = [
        {
          id: '1',
          // Missing firstName
          lastName: 'Doe',
          email: 'invalid-email',
          phone: '555-1234'
        },
        {
          // Missing id
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane.smith@example.com',
          phone: '555-5678'
        }
      ];

      const result = await crmExportService.validateExportData(invalidLeads);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Lead 1: Missing first name');
      expect(result.errors).toContain('Lead 1: Invalid or missing email');
      expect(result.errors).toContain('Lead 2: Missing ID');
    });

    it('should validate email format', async () => {
      const leadsWithInvalidEmails = [
        {
          id: '1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'not-an-email',
          phone: '555-1234'
        },
        {
          id: '2',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@',
          phone: '555-5678'
        }
      ];

      const result = await crmExportService.validateExportData(leadsWithInvalidEmails);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Lead 1: Invalid or missing email');
      expect(result.errors).toContain('Lead 2: Invalid or missing email');
    });
  });

  describe('Data Sanitization', () => {
    it('should sanitize lead data', async () => {
      const leads = [
        {
          id: '1',
          firstName: '  John  ',
          lastName: 'Doe<script>',
          email: '  JOHN.DOE@EXAMPLE.COM  ',
          phone: '(555) 123-4567'
        }
      ];

      const result = await crmExportService.sanitizeData(leads);
      
      expect(result[0].firstName).toBe('John');
      expect(result[0].lastName).toBe('Doe');
      expect(result[0].email).toBe('john.doe@example.com');
      expect(result[0].phone).toBe('5551234567');
    });

    it('should handle null and undefined values', async () => {
      const leads = [
        {
          id: '1',
          firstName: null,
          lastName: undefined,
          email: 'john.doe@example.com',
          phone: null
        }
      ];

      const result = await crmExportService.sanitizeData(leads);
      
      expect(result[0].firstName).toBe('');
      expect(result[0].lastName).toBe('');
      expect(result[0].email).toBe('john.doe@example.com');
      expect(result[0].phone).toBe('');
    });
  });

  describe('Error Handling', () => {
    it('should throw error for unsupported format', async () => {
      const leads = [
        {
          id: '1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '555-1234'
        }
      ];

      await expect(crmExportService.exportLeads(leads, 'unsupported'))
        .rejects.toThrow('Unsupported format: unsupported');
    });

    it('should handle large datasets', async () => {
      const leads = Array.from({ length: 10000 }, (_, i) => ({
        id: `${i + 1}`,
        firstName: `User${i + 1}`,
        lastName: 'Test',
        email: `user${i + 1}@example.com`,
        phone: `555-${String(i + 1).padStart(4, '0')}`
      }));

      const result = await crmExportService.exportLeads(leads, 'csv');
      
      expect(result).toContain('id,firstName,lastName,email,phone');
      expect(result.split('\n')).toHaveLength(10001); // Header + 10000 rows
    });
  });

  describe('Performance', () => {
    it('should export data within reasonable time', async () => {
      const leads = Array.from({ length: 1000 }, (_, i) => ({
        id: `${i + 1}`,
        firstName: `User${i + 1}`,
        lastName: 'Test',
        email: `user${i + 1}@example.com`,
        phone: `555-${String(i + 1).padStart(4, '0')}`
      }));

      const startTime = Date.now();
      await crmExportService.exportLeads(leads, 'json');
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});
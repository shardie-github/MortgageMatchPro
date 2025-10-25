import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import Tesseract from 'tesseract.js'
import * as pdfParse from 'pdf-parse'
import * as mammoth from 'mammoth'
import * as XLSX from 'xlsx'
import { createHash } from 'crypto'
import { z } from 'zod'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Document types and schemas
export const DocumentTypeSchema = z.enum([
  'tax_return',
  'paystub',
  't4',
  'w2',
  'bank_statement',
  'employment_letter',
  'credit_report',
  'property_assessment',
  'insurance_document',
  'other'
])

export const DocumentStatusSchema = z.enum([
  'uploaded',
  'processing',
  'extracted',
  'verified',
  'flagged',
  'rejected'
])

export const ExtractedDataSchema = z.object({
  documentType: DocumentTypeSchema,
  confidence: z.number().min(0).max(1),
  extractedFields: z.record(z.any()),
  verificationFlags: z.array(z.string()),
  complianceFlags: z.array(z.string()),
  metadata: z.object({
    processingTime: z.number(),
    ocrConfidence: z.number(),
    llmConfidence: z.number(),
    extractionMethod: z.string(),
    documentHash: z.string()
  })
})

export const AffordabilityReportSchema = z.object({
  userId: z.string(),
  documentId: z.string(),
  extractedIncome: z.number(),
  extractedDebts: z.number(),
  extractedAssets: z.number(),
  employmentStatus: z.string(),
  creditScore: z.number().optional(),
  verificationStatus: z.string(),
  confidenceScore: z.number(),
  recommendations: z.array(z.string()),
  complianceNotes: z.array(z.string()),
  underwritingSummary: z.string(),
  riskFactors: z.array(z.string()),
  nextSteps: z.array(z.string())
})

export type DocumentType = z.infer<typeof DocumentTypeSchema>
export type DocumentStatus = z.infer<typeof DocumentStatusSchema>
export type ExtractedData = z.infer<typeof ExtractedDataSchema>
export type AffordabilityReport = z.infer<typeof AffordabilityReportSchema>

export interface DocumentUpload {
  file: Buffer
  filename: string
  mimeType: string
  userId: string
  documentType?: DocumentType
}

export interface DocumentProcessingResult {
  documentId: string
  status: DocumentStatus
  extractedData?: ExtractedData
  affordabilityReport?: AffordabilityReport
  errors: string[]
  processingTime: number
}

export class DocumentAIAgent {
  private model = 'gpt-4o'
  private embeddingModel = 'text-embedding-3-small'

  // Main document processing pipeline
  async processDocument(upload: DocumentUpload): Promise<DocumentProcessingResult> {
    const startTime = Date.now()
    const documentId = this.generateDocumentId(upload)
    
    try {
      console.log(`Processing document ${documentId} for user ${upload.userId}`)

      // Step 1: Store document metadata
      await this.storeDocumentMetadata(documentId, upload)

      // Step 2: Extract text using OCR/parsing
      const extractedText = await this.extractTextFromDocument(upload)

      // Step 3: Classify document type
      const documentType = await this.classifyDocumentType(extractedText, upload.mimeType)

      // Step 4: Extract structured data using LLM + RAG
      const extractedData = await this.extractStructuredData(extractedText, documentType)

      // Step 5: Verify and validate extracted data
      const verificationResult = await this.verifyExtractedData(extractedData, documentType)

      // Step 6: Generate affordability report
      const affordabilityReport = await this.generateAffordabilityReport(
        documentId,
        upload.userId,
        verificationResult
      )

      // Step 7: Update document status
      await this.updateDocumentStatus(documentId, 'verified', {
        extractedData: verificationResult,
        affordabilityReport
      })

      const processingTime = Date.now() - startTime

      return {
        documentId,
        status: 'verified',
        extractedData: verificationResult,
        affordabilityReport,
        errors: [],
        processingTime
      }

    } catch (error) {
      console.error(`Error processing document ${documentId}:`, error)
      
      await this.updateDocumentStatus(documentId, 'rejected', {
        error: error.toString()
      })

      return {
        documentId,
        status: 'rejected',
        errors: [error.toString()],
        processingTime: Date.now() - startTime
      }
    }
  }

  // Extract text from various document formats
  private async extractTextFromDocument(upload: DocumentUpload): Promise<string> {
    const { file, mimeType, filename } = upload

    try {
      if (mimeType === 'application/pdf') {
        return await this.extractTextFromPDF(file)
      } else if (mimeType.includes('image/')) {
        return await this.extractTextFromImage(file)
      } else if (mimeType.includes('text/') || mimeType === 'application/json') {
        return file.toString('utf-8')
      } else if (mimeType.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
        return await this.extractTextFromWord(file)
      } else if (mimeType.includes('application/vnd.ms-excel') || mimeType.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')) {
        return await this.extractTextFromExcel(file)
      } else {
        throw new Error(`Unsupported file type: ${mimeType}`)
      }
    } catch (error) {
      console.error(`Error extracting text from ${filename}:`, error)
      throw error
    }
  }

  // Extract text from PDF using pdf-parse
  private async extractTextFromPDF(file: Buffer): Promise<string> {
    try {
      const data = await pdfParse(file)
      return data.text
    } catch (error) {
      console.error('Error parsing PDF:', error)
      throw error
    }
  }

  // Extract text from images using Tesseract OCR
  private async extractTextFromImage(file: Buffer): Promise<string> {
    try {
      const { data: { text } } = await Tesseract.recognize(file, 'eng', {
        logger: m => console.log(m)
      })
      return text
    } catch (error) {
      console.error('Error performing OCR:', error)
      throw error
    }
  }

  // Extract text from Word documents
  private async extractTextFromWord(file: Buffer): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ buffer: file })
      return result.value
    } catch (error) {
      console.error('Error parsing Word document:', error)
      throw error
    }
  }

  // Extract text from Excel files
  private async extractTextFromExcel(file: Buffer): Promise<string> {
    try {
      const workbook = XLSX.read(file, { type: 'buffer' })
      let text = ''
      
      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName]
        const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
        text += `Sheet: ${sheetName}\n`
        text += sheetData.map(row => Array.isArray(row) ? row.join('\t') : JSON.stringify(row)).join('\n')
        text += '\n\n'
      })
      
      return text
    } catch (error) {
      console.error('Error parsing Excel file:', error)
      throw error
    }
  }

  // Classify document type using LLM
  private async classifyDocumentType(text: string, mimeType: string): Promise<DocumentType> {
    try {
      const response = await openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are a document classification expert. Classify financial documents into one of these types:
            - tax_return: Tax returns, T1, 1040 forms
            - paystub: Pay stubs, salary statements
            - t4: Canadian T4 tax slips
            - w2: US W-2 tax forms
            - bank_statement: Bank statements, account summaries
            - employment_letter: Employment verification letters
            - credit_report: Credit reports, credit scores
            - property_assessment: Property assessments, appraisals
            - insurance_document: Insurance policies, coverage documents
            - other: Any other financial document
            
            Return only the document type as a single word.`
          },
          {
            role: 'user',
            content: `Classify this document (MIME type: ${mimeType}):
            
            ${text.substring(0, 2000)}...`
          }
        ],
        temperature: 0.1,
        max_tokens: 50
      })

      const classification = response.choices[0].message.content?.trim().toLowerCase()
      return DocumentTypeSchema.parse(classification || 'other')
    } catch (error) {
      console.error('Error classifying document:', error)
      return 'other'
    }
  }

  // Extract structured data using LLM with RAG
  private async extractStructuredData(text: string, documentType: DocumentType): Promise<ExtractedData> {
    try {
      // Get relevant context from knowledge base
      const context = await this.getRelevantContext(documentType, text)

      const prompt = this.buildExtractionPrompt(documentType, text, context)

      const response = await openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are a financial document extraction expert. Extract structured data from financial documents with high accuracy. Return valid JSON matching the ExtractedDataSchema.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 2000
      })

      const extractedData = JSON.parse(response.choices[0].message.content || '{}')
      return ExtractedDataSchema.parse(extractedData)
    } catch (error) {
      console.error('Error extracting structured data:', error)
      throw error
    }
  }

  // Get relevant context for document extraction
  private async getRelevantContext(documentType: DocumentType, text: string): Promise<string> {
    try {
      // Generate embedding for the text
      const embedding = await this.generateEmbedding(text)

      // Search for similar documents in knowledge base
      const { data: similarDocs } = await supabaseAdmin
        .from('document_knowledge_base')
        .select('content, extraction_examples')
        .eq('document_type', documentType)
        .limit(5)

      if (!similarDocs || similarDocs.length === 0) {
        return this.getDefaultContext(documentType)
      }

      return similarDocs
        .map(doc => doc.extraction_examples)
        .join('\n\n')
    } catch (error) {
      console.error('Error getting relevant context:', error)
      return this.getDefaultContext(documentType)
    }
  }

  // Generate embedding for text
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await openai.embeddings.create({
        model: this.embeddingModel,
        input: text.substring(0, 8000) // Limit text length
      })

      return response.data[0].embedding
    } catch (error) {
      console.error('Error generating embedding:', error)
      return []
    }
  }

  // Get default context for document type
  private getDefaultContext(documentType: DocumentType): string {
    const contexts = {
      tax_return: `Extract: Total income, taxable income, deductions, refunds, filing status, dependents, employment income, investment income, business income.`,
      paystub: `Extract: Gross pay, net pay, pay period, year-to-date amounts, deductions (taxes, insurance, retirement), employer name, employee ID.`,
      t4: `Extract: Box 14 (employment income), Box 16 (federal tax), Box 17 (provincial tax), Box 18 (CPP), Box 20 (EI), Box 24 (EI insurable earnings), Box 26 (CPP pensionable earnings).`,
      w2: `Extract: Box 1 (wages), Box 2 (federal tax withheld), Box 3 (social security wages), Box 4 (social security tax), Box 5 (medicare wages), Box 6 (medicare tax), Box 12 (deferred compensation).`,
      bank_statement: `Extract: Account number, statement period, beginning balance, ending balance, total deposits, total withdrawals, account type, bank name.`,
      employment_letter: `Extract: Employee name, position, start date, salary, employment status, employer name, letter date, manager signature.`,
      credit_report: `Extract: Credit score, credit utilization, payment history, account balances, credit limits, inquiries, derogatory marks, account types.`,
      property_assessment: `Extract: Property address, assessed value, property type, lot size, building size, year built, tax assessment, market value estimate.`,
      insurance_document: `Extract: Policy number, coverage amount, premium, deductible, policy period, coverage type, insurer name, beneficiary.`,
      other: `Extract any relevant financial information, dates, amounts, names, and identifying information.`
    }

    return contexts[documentType] || contexts.other
  }

  // Build extraction prompt
  private buildExtractionPrompt(documentType: DocumentType, text: string, context: string): string {
    return `
Extract structured data from this ${documentType} document:

CONTEXT AND EXAMPLES:
${context}

DOCUMENT TEXT:
${text.substring(0, 4000)}

EXTRACTION REQUIREMENTS:
1. Extract all relevant financial data with high accuracy
2. Flag any missing or unclear information
3. Identify potential compliance issues
4. Provide confidence scores for each extracted field
5. Note any anomalies or inconsistencies

Return JSON matching this schema:
{
  "documentType": "${documentType}",
  "confidence": 0.0-1.0,
  "extractedFields": {
    // Key-value pairs of extracted data
  },
  "verificationFlags": [
    // List of fields that need verification
  ],
  "complianceFlags": [
    // List of potential compliance issues
  ],
  "metadata": {
    "processingTime": 0,
    "ocrConfidence": 0.0-1.0,
    "llmConfidence": 0.0-1.0,
    "extractionMethod": "llm_rag",
    "documentHash": "hash"
  }
}
`
  }

  // Verify and validate extracted data
  private async verifyExtractedData(extractedData: ExtractedData, documentType: DocumentType): Promise<ExtractedData> {
    try {
      // Add verification logic based on document type
      const verificationFlags: string[] = []
      const complianceFlags: string[] = []

      // Check for required fields based on document type
      const requiredFields = this.getRequiredFields(documentType)
      for (const field of requiredFields) {
        if (!extractedData.extractedFields[field]) {
          verificationFlags.push(`Missing required field: ${field}`)
        }
      }

      // Check for data consistency
      if (documentType === 'paystub') {
        const grossPay = extractedData.extractedFields.gross_pay
        const netPay = extractedData.extractedFields.net_pay
        if (grossPay && netPay && grossPay <= netPay) {
          complianceFlags.push('Gross pay should be greater than net pay')
        }
      }

      // Check for reasonable values
      if (extractedData.extractedFields.income) {
        const income = Number(extractedData.extractedFields.income)
        if (income < 0 || income > 10000000) {
          complianceFlags.push('Income value appears unreasonable')
        }
      }

      return {
        ...extractedData,
        verificationFlags: [...extractedData.verificationFlags, ...verificationFlags],
        complianceFlags: [...extractedData.complianceFlags, ...complianceFlags]
      }
    } catch (error) {
      console.error('Error verifying extracted data:', error)
      return extractedData
    }
  }

  // Get required fields for document type
  private getRequiredFields(documentType: DocumentType): string[] {
    const requiredFields = {
      tax_return: ['total_income', 'taxable_income'],
      paystub: ['gross_pay', 'net_pay', 'pay_period'],
      t4: ['employment_income', 'federal_tax'],
      w2: ['wages', 'federal_tax_withheld'],
      bank_statement: ['account_number', 'statement_period', 'ending_balance'],
      employment_letter: ['employee_name', 'position', 'salary'],
      credit_report: ['credit_score'],
      property_assessment: ['assessed_value', 'property_address'],
      insurance_document: ['policy_number', 'coverage_amount'],
      other: []
    }

    return requiredFields[documentType] || []
  }

  // Generate affordability report
  private async generateAffordabilityReport(
    documentId: string,
    userId: string,
    extractedData: ExtractedData
  ): Promise<AffordabilityReport> {
    try {
      const response = await openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are a mortgage underwriting expert. Generate a comprehensive affordability report based on extracted financial document data. Include verification status, risk factors, and recommendations.`
          },
          {
            role: 'user',
            content: `Generate an affordability report for user ${userId} based on this extracted data:

Document Type: ${extractedData.documentType}
Confidence: ${extractedData.confidence}
Extracted Fields: ${JSON.stringify(extractedData.extractedFields, null, 2)}
Verification Flags: ${extractedData.verificationFlags.join(', ')}
Compliance Flags: ${extractedData.complianceFlags.join(', ')}

Return JSON matching the AffordabilityReportSchema.`
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 1500
      })

      const report = JSON.parse(response.choices[0].message.content || '{}')
      return AffordabilityReportSchema.parse({
        ...report,
        userId,
        documentId
      })
    } catch (error) {
      console.error('Error generating affordability report:', error)
      throw error
    }
  }

  // Store document metadata
  private async storeDocumentMetadata(documentId: string, upload: DocumentUpload): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('documents')
        .insert({
          id: documentId,
          user_id: upload.userId,
          filename: upload.filename,
          mime_type: upload.mimeType,
          document_type: upload.documentType || 'other',
          status: 'uploaded',
          file_size: upload.file.length,
          created_at: new Date().toISOString()
        })

      if (error) throw error
    } catch (error) {
      console.error('Error storing document metadata:', error)
      throw error
    }
  }

  // Update document status
  private async updateDocumentStatus(
    documentId: string,
    status: DocumentStatus,
    data?: any
  ): Promise<void> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      }

      if (data) {
        if (data.extractedData) {
          updateData.extracted_data = data.extractedData
        }
        if (data.affordabilityReport) {
          updateData.affordability_report = data.affordabilityReport
        }
        if (data.error) {
          updateData.error_message = data.error
        }
      }

      const { error } = await supabaseAdmin
        .from('documents')
        .update(updateData)
        .eq('id', documentId)

      if (error) throw error
    } catch (error) {
      console.error('Error updating document status:', error)
      throw error
    }
  }

  // Generate unique document ID
  private generateDocumentId(upload: DocumentUpload): string {
    const hash = createHash('sha256')
    hash.update(upload.file)
    hash.update(upload.userId)
    hash.update(Date.now().toString())
    return hash.digest('hex').substring(0, 16)
  }

  // Get document processing status
  async getDocumentStatus(documentId: string): Promise<DocumentStatus | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('documents')
        .select('status')
        .eq('id', documentId)
        .single()

      if (error) throw error
      return data?.status || null
    } catch (error) {
      console.error('Error getting document status:', error)
      return null
    }
  }

  // Get user's documents
  async getUserDocuments(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('documents')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting user documents:', error)
      return []
    }
  }

  // Batch process multiple documents
  async batchProcessDocuments(uploads: DocumentUpload[]): Promise<DocumentProcessingResult[]> {
    const results: DocumentProcessingResult[] = []

    for (const upload of uploads) {
      try {
        const result = await this.processDocument(upload)
        results.push(result)
      } catch (error) {
        results.push({
          documentId: this.generateDocumentId(upload),
          status: 'rejected',
          errors: [error.toString()],
          processingTime: 0
        })
      }
    }

    return results
  }
}
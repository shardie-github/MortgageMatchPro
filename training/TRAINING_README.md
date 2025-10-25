# AI Training Pipeline - MortgageMatchPro v1.2.0

This directory contains the AI fine-tuning and continuous learning pipeline for MortgageMatchPro.

## Overview

The training pipeline enables continuous improvement of AI models through:
- Dataset preparation from user interactions
- Fine-tuning with OpenAI's API
- Performance monitoring and evaluation
- Model rollback capabilities

## Directory Structure

```
training/
├── prepareDataset.ts          # Dataset preparation and cleaning
├── runFineTune.mjs           # Fine-tuning execution script
├── datasets/                 # Prepared training datasets
├── results/                  # Training results and metrics
└── TRAINING_README.md        # This file
```

## Quick Start

### 1. Prepare Dataset

```bash
# Prepare dataset from user interactions
npx ts-node training/prepareDataset.ts

# With date range
npx ts-node training/prepareDataset.ts --start=2024-01-01 --end=2024-01-31

# For specific categories
npx ts-node training/prepareDataset.ts --categories=mortgage_recommendation,rate_explanation
```

### 2. Run Fine-Tuning

```bash
# List available datasets
node training/runFineTune.mjs list-datasets

# Run fine-tuning job
node training/runFineTune.mjs run ./datasets/dataset_1.2.0_1234567890.json

# With custom parameters
node training/runFineTune.mjs run ./datasets/dataset.json \
  --model=gpt-3.5-turbo \
  --epochs=5 \
  --batch-size=2 \
  --learning-rate=1.5 \
  --suffix=mortgagematch-v1.2.0
```

### 3. Test Fine-Tuned Model

```bash
# Test the model
node training/runFineTune.mjs test ft-abc123 "Recommend a mortgage for first-time buyer"

# List all jobs
node training/runFineTune.mjs list-jobs
```

### 4. Rollback if Needed

```bash
# Rollback to base model
node training/runFineTune.mjs rollback ft-abc123
```

## Dataset Preparation

The `prepareDataset.ts` script processes user interactions and prepares them for training:

### Features

- **Data Cleaning**: Removes invalid or low-quality examples
- **Anonymization**: Strips PII and sensitive information
- **Quality Filtering**: Filters by rating and content quality
- **Categorization**: Groups examples by prompt type
- **Balancing**: Ensures balanced representation across categories
- **Validation**: Validates dataset quality before training

### Output Format

The script outputs JSONL format compatible with OpenAI's fine-tuning API:

```json
{"messages": [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]}
{"messages": [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]}
```

### Quality Metrics

- **Minimum Examples**: 100 per dataset
- **Quality Score**: > 0.7 (0-1 scale)
- **Message Structure**: Valid conversation format
- **Category Balance**: At least 10 examples per category

## Fine-Tuning Process

The `runFineTune.mjs` script handles the complete fine-tuning workflow:

### Workflow

1. **Dataset Validation**: Checks format and quality
2. **File Upload**: Uploads training data to OpenAI
3. **Job Creation**: Creates fine-tuning job with parameters
4. **Monitoring**: Tracks job progress and status
5. **Results**: Saves training results and metrics

### Parameters

- `--model`: Base model (default: gpt-3.5-turbo)
- `--epochs`: Training epochs (default: 3)
- `--batch-size`: Batch size (default: 1)
- `--learning-rate`: Learning rate multiplier (default: 2.0)
- `--suffix`: Model suffix for identification

### Monitoring

The script monitors job progress with:
- Status updates every minute
- Automatic timeout handling
- Error detection and reporting
- Progress tracking

## Performance Evaluation

### Metrics Tracked

- **Training Loss**: Model performance during training
- **Validation Loss**: Performance on validation data
- **Accuracy**: Response accuracy on test cases
- **Confidence**: Model confidence in predictions
- **Cost**: Training and inference costs
- **Latency**: Response time improvements

### Evaluation Process

1. **Baseline Testing**: Test base model performance
2. **Fine-Tuned Testing**: Test improved model
3. **A/B Comparison**: Compare performance metrics
4. **User Feedback**: Collect user satisfaction scores
5. **Cost Analysis**: Evaluate cost-effectiveness

## Model Management

### Version Control

- Each fine-tuned model gets a unique ID
- Training parameters are logged
- Performance metrics are tracked
- Rollback capabilities are maintained

### Deployment

1. **Testing**: Thorough testing on validation data
2. **Staging**: Deploy to staging environment
3. **Monitoring**: Track performance in production
4. **Rollback**: Quick rollback if issues arise

### Rollback Process

If a fine-tuned model performs worse than the base model:

1. **Detection**: Automated performance monitoring
2. **Alert**: Notify development team
3. **Rollback**: Switch back to base model
4. **Investigation**: Analyze what went wrong
5. **Retraining**: Prepare improved dataset

## Best Practices

### Dataset Quality

- **Diverse Examples**: Include various user scenarios
- **High Quality**: Only include high-rated interactions
- **Balanced**: Equal representation across categories
- **Recent**: Use recent data for current relevance

### Training Parameters

- **Epochs**: Start with 3, increase if needed
- **Batch Size**: Use 1 for small datasets
- **Learning Rate**: Start with 2.0, adjust based on results
- **Validation**: Always validate on held-out data

### Monitoring

- **Regular Evaluation**: Test performance weekly
- **User Feedback**: Collect and analyze feedback
- **Cost Tracking**: Monitor training and inference costs
- **Performance Alerts**: Set up automated alerts

## Troubleshooting

### Common Issues

**Dataset Too Small**
- Collect more user interactions
- Lower quality thresholds
- Include more diverse examples

**Poor Performance**
- Check data quality
- Adjust training parameters
- Validate on more test cases

**High Costs**
- Reduce training frequency
- Use smaller datasets
- Optimize model parameters

**Validation Errors**
- Check data format
- Verify message structure
- Ensure proper JSONL format

### Debug Commands

```bash
# Validate dataset
npx ts-node training/prepareDataset.ts --validate-only

# Check job status
node training/runFineTune.mjs list-jobs

# Test model with debug info
node training/runFineTune.mjs test ft-abc123 "test prompt" --debug
```

## Security and Privacy

### Data Protection

- **Anonymization**: All PII is removed
- **Encryption**: Sensitive data is encrypted
- **Access Control**: Limited access to training data
- **Audit Trail**: All actions are logged

### Compliance

- **GDPR**: European data protection compliance
- **CCPA**: California privacy compliance
- **PIPEDA**: Canadian privacy compliance
- **AI Ethics**: Ethical AI practices

## Support

For questions or issues with the training pipeline:

1. Check this documentation
2. Review error logs
3. Contact the AI team
4. Create an issue in the repository

## Changelog

### v1.2.0
- Initial training pipeline implementation
- OpenAI fine-tuning integration
- Dataset preparation and validation
- Performance monitoring and evaluation
- Model management and rollback capabilities
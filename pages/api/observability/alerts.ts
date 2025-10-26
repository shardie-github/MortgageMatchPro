/**
 * Alerts API - MortgageMatchPro v1.4.0
 * 
 * RESTful API for managing and monitoring system alerts
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { monitoringService } from '../../../core/observability/monitoring';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return handleGetAlerts(req, res);
  } else if (req.method === 'POST') {
    return handleCreateAlert(req, res);
  } else if (req.method === 'PUT') {
    return handleUpdateAlert(req, res);
  } else if (req.method === 'DELETE') {
    return handleDeleteAlert(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleGetAlerts(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { alertId, status } = req.query;

    if (alertId) {
      // Get specific alert
      const alertStatus = monitoringService.getAlertStatus(alertId as string);
      
      if (!alertStatus) {
        return res.status(404).json({ 
          error: `Alert '${alertId}' not found` 
        });
      }

      return res.status(200).json({
        alertId,
        status: alertStatus.triggered ? 'triggered' : 'normal',
        lastTriggered: alertStatus.lastTriggered.toISOString(),
        triggered: alertStatus.triggered
      });
    } else {
      // Get all alerts
      const alerts = monitoringService.getAllAlerts();
      const alertStatuses = alerts.map(alert => {
        const status = monitoringService.getAlertStatus(alert.id);
        return {
          ...alert,
          status: status?.triggered ? 'triggered' : 'normal',
          lastTriggered: status?.lastTriggered.toISOString(),
          triggered: status?.triggered || false
        };
      });

      // Filter by status if specified
      let filteredAlerts = alertStatuses;
      if (status) {
        filteredAlerts = alertStatuses.filter(alert => 
          alert.status === status
        );
      }

      return res.status(200).json({
        alerts: filteredAlerts,
        total: filteredAlerts.length,
        triggered: filteredAlerts.filter(a => a.triggered).length
      });
    }

  } catch (error) {
    console.error('Get alerts error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleCreateAlert(req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      id,
      name,
      description,
      metric,
      condition,
      threshold,
      duration,
      severity,
      enabled = true,
      channels = [],
      cooldown = 300
    } = req.body;

    // Validate required fields
    if (!id || !name || !metric || !condition || threshold === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields: id, name, metric, condition, threshold' 
      });
    }

    // Validate condition
    const validConditions = ['gt', 'lt', 'eq', 'gte', 'lte'];
    if (!validConditions.includes(condition)) {
      return res.status(400).json({ 
        error: `Invalid condition. Must be one of: ${validConditions.join(', ')}` 
      });
    }

    // Validate severity
    const validSeverities = ['low', 'medium', 'high', 'critical'];
    if (!validSeverities.includes(severity)) {
      return res.status(400).json({ 
        error: `Invalid severity. Must be one of: ${validSeverities.join(', ')}` 
      });
    }

    const alertConfig = {
      id,
      name,
      description: description || '',
      metric,
      condition,
      threshold: Number(threshold),
      duration: Number(duration) || 60,
      severity,
      enabled: Boolean(enabled),
      channels: Array.isArray(channels) ? channels : [],
      cooldown: Number(cooldown)
    };

    monitoringService.configureAlert(alertConfig);

    return res.status(201).json({
      message: 'Alert created successfully',
      alert: alertConfig
    });

  } catch (error) {
    console.error('Create alert error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleUpdateAlert(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { alertId } = req.query;
    const updates = req.body;

    if (!alertId) {
      return res.status(400).json({ 
        error: 'Missing alertId parameter' 
      });
    }

    // Get existing alert
    const existingAlert = monitoringService.getAllAlerts().find(a => a.id === alertId);
    if (!existingAlert) {
      return res.status(404).json({ 
        error: `Alert '${alertId}' not found` 
      });
    }

    // Merge updates
    const updatedAlert = {
      ...existingAlert,
      ...updates
    };

    monitoringService.configureAlert(updatedAlert);

    return res.status(200).json({
      message: 'Alert updated successfully',
      alert: updatedAlert
    });

  } catch (error) {
    console.error('Update alert error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleDeleteAlert(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { alertId } = req.query;

    if (!alertId) {
      return res.status(400).json({ 
        error: 'Missing alertId parameter' 
      });
    }

    // Check if alert exists
    const existingAlert = monitoringService.getAllAlerts().find(a => a.id === alertId);
    if (!existingAlert) {
      return res.status(404).json({ 
        error: `Alert '${alertId}' not found` 
      });
    }

    // Note: The monitoring service doesn't have a delete method in this implementation
    // In a real implementation, you would add a deleteAlert method
    // For now, we'll disable the alert
    monitoringService.configureAlert({
      ...existingAlert,
      enabled: false
    });

    return res.status(200).json({
      message: 'Alert disabled successfully',
      alertId
    });

  } catch (error) {
    console.error('Delete alert error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
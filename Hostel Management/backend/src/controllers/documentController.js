const documentService = require('../services/documentService');

async function requestDocument(req, res, next) {
  try {
    const doc = await documentService.requestDocument(req.user, req.body);
    res.status(201).json({
      success: true,
      message: 'Document Request submitted successfully!',
      data: doc
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function getDocumentRequests(req, res, next) {
  try {
    const result = await documentService.getDocumentRequests(req.user, req.query);
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function getDocumentRequestById(req, res, next) {
  try {
    const doc = await documentService.getDocumentRequestById(req.user, req.params.id);
    res.json({
      success: true,
      data: doc
    });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
}

async function approveAndIssueDocument(req, res, next) {
  try {
    const doc = await documentService.approveAndIssueDocument(req.user, req.params.id, req.body);
    res.json({
      success: true,
      message: 'Certificate issued successfully!',
      data: doc
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function rejectDocumentRequest(req, res, next) {
  try {
    const doc = await documentService.rejectDocumentRequest(req.user, req.params.id, req.body);
    res.json({
      success: true,
      message: 'Document Request rejected.',
      data: doc
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function cancelDocumentRequest(req, res, next) {
  try {
    const doc = await documentService.cancelDocumentRequest(req.user, req.params.id);
    res.json({
      success: true,
      message: 'Document Request cancelled successfully.',
      data: doc
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function getDocumentStats(req, res, next) {
  try {
    const stats = await documentService.getDocumentStats(req.user);
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  requestDocument,
  getDocumentRequests,
  getDocumentRequestById,
  approveAndIssueDocument,
  rejectDocumentRequest,
  cancelDocumentRequest,
  getDocumentStats
};

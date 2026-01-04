import React, { useState, useEffect } from 'react';
import {
  ManualInvestigation,
  InvestigationTemplate,
  InvestigationType,
  Priority,
  Collaborator,
  InvestigationStep
} from '../types/manualInvestigation';

interface InvestigationWizardProps {
  templates: InvestigationTemplate[];
  availableCollaborators: Omit<Collaborator, 'addedAt' | 'addedBy' | 'permissions'>[];
  currentUserId: string;
  currentUserName: string;
  onCreateInvestigation: (investigation: Omit<ManualInvestigation, 'id' | 'createdAt' | 'updatedAt' | 'timeline' | 'progress'>) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

interface FormData {
  title: string;
  description: string;
  type: InvestigationType;
  priority: Priority;
  templateId?: string;
  customWorkflow: boolean;
  dueDate?: string;
  leadInvestigator: string;
  selectedCollaborators: string[];
  subjectInformation: {
    primarySubject?: string;
    relatedSubjects?: string[];
    affectedAccounts?: string[];
    incidentDate?: string;
    reportedDate?: string;
    reportedBy?: string;
    externalCaseId?: string;
  };
  tags: string[];
  confidentialityLevel: 'public' | 'internal' | 'confidential' | 'restricted';
  category: string;
  jurisdiction?: string;
}

const INVESTIGATION_TYPES: { value: InvestigationType; label: string }[] = [
  { value: 'fraud_detection', label: 'Fraud Detection' },
  { value: 'account_takeover', label: 'Account Takeover' },
  { value: 'identity_theft', label: 'Identity Theft' },
  { value: 'payment_fraud', label: 'Payment Fraud' },
  { value: 'data_breach', label: 'Data Breach' },
  { value: 'compliance_violation', label: 'Compliance Violation' },
  { value: 'internal_misconduct', label: 'Internal Misconduct' },
  { value: 'external_threat', label: 'External Threat' }
];

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' }
];

const CONFIDENTIALITY_LEVELS = [
  { value: 'public', label: 'Public' },
  { value: 'internal', label: 'Internal' },
  { value: 'confidential', label: 'Confidential' },
  { value: 'restricted', label: 'Restricted' }
];

export const InvestigationWizard: React.FC<InvestigationWizardProps> = ({
  templates,
  availableCollaborators,
  currentUserId,
  currentUserName,
  onCreateInvestigation,
  onCancel,
  isLoading = false
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    type: 'fraud_detection',
    priority: 'medium',
    customWorkflow: false,
    leadInvestigator: currentUserId,
    selectedCollaborators: [],
    subjectInformation: {},
    tags: [],
    confidentialityLevel: 'internal',
    category: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tagInput, setTagInput] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<InvestigationTemplate | null>(null);

  const totalSteps = 4;

  useEffect(() => {
    if (formData.templateId && !formData.customWorkflow) {
      const template = templates.find(t => t.id === formData.templateId);
      setSelectedTemplate(template || null);
    } else {
      setSelectedTemplate(null);
    }
  }, [formData.templateId, formData.customWorkflow, templates]);

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!formData.title.trim()) newErrors.title = 'Title is required';
        if (!formData.description.trim()) newErrors.description = 'Description is required';
        if (!formData.type) newErrors.type = 'Investigation type is required';
        if (!formData.priority) newErrors.priority = 'Priority is required';
        break;

      case 2:
        if (!formData.customWorkflow && !formData.templateId) {
          newErrors.template = 'Please select a template or choose custom workflow';
        }
        break;

      case 3:
        if (!formData.leadInvestigator) newErrors.leadInvestigator = 'Lead investigator is required';
        if (!formData.category.trim()) newErrors.category = 'Category is required';
        break;

      case 4:
        // Final validation
        if (!formData.title.trim()) newErrors.title = 'Title is required';
        if (!formData.description.trim()) newErrors.description = 'Description is required';
        if (!formData.leadInvestigator) newErrors.leadInvestigator = 'Lead investigator is required';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = () => {
    if (!validateStep(4)) return;

    const steps: InvestigationStep[] = selectedTemplate
      ? selectedTemplate.steps.map((templateStep, index) => ({
          ...templateStep,
          id: `step-${Date.now()}-${index}`,
          status: 'pending' as const,
          notes: '',
          evidence: [],
          order: index + 1
        }))
      : [];

    const collaborators: Collaborator[] = formData.selectedCollaborators
      .map(id => availableCollaborators.find(c => c.id === id))
      .filter(Boolean)
      .map(collaborator => ({
        ...collaborator!,
        addedAt: new Date().toISOString(),
        addedBy: currentUserId,
        permissions: {
          canEdit: collaborator!.role === 'lead_investigator' || collaborator!.role === 'investigator',
          canAddEvidence: true,
          canAssignSteps: collaborator!.role === 'lead_investigator' || collaborator!.role === 'investigator',
          canReview: collaborator!.role !== 'observer',
          canExport: collaborator!.role !== 'observer'
        }
      }));

    const investigation: Omit<ManualInvestigation, 'id' | 'createdAt' | 'updatedAt' | 'timeline' | 'progress'> = {
      title: formData.title,
      description: formData.description,
      type: formData.type,
      status: 'draft',
      priority: formData.priority,
      templateId: formData.templateId,
      templateName: selectedTemplate?.name,
      customWorkflow: formData.customWorkflow,
      startedAt: undefined,
      completedAt: undefined,
      dueDate: formData.dueDate,
      createdBy: currentUserId,
      leadInvestigator: formData.leadInvestigator,
      collaborators,
      steps,
      evidence: [],
      subjectInformation: formData.subjectInformation,
      findings: [],
      conclusions: [],
      recommendations: [],
      actionsTaken: [],
      tags: formData.tags,
      category: formData.category,
      jurisdiction: formData.jurisdiction,
      confidentialityLevel: formData.confidentialityLevel,
      relatedInvestigations: [],
      childInvestigations: []
    };

    onCreateInvestigation(investigation);
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const addSubject = (field: 'relatedSubjects' | 'affectedAccounts', value: string) => {
    if (!value.trim()) return;

    setFormData(prev => ({
      ...prev,
      subjectInformation: {
        ...prev.subjectInformation,
        [field]: [...(prev.subjectInformation[field] || []), value.trim()]
      }
    }));
  };

  const removeSubject = (field: 'relatedSubjects' | 'affectedAccounts', index: number) => {
    setFormData(prev => ({
      ...prev,
      subjectInformation: {
        ...prev.subjectInformation,
        [field]: prev.subjectInformation[field]?.filter((_, i) => i !== index) || []
      }
    }));
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-center mt-4 text-gray-600">Creating investigation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Create New Investigation</h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress Steps */}
          <div className="mt-4">
            <div className="flex items-center">
              {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
                <React.Fragment key={step}>
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                    step <= currentStep
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {step}
                  </div>
                  {step < totalSteps && (
                    <div className={`flex-1 h-1 mx-2 ${
                      step < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                    }`} />
                  )}
                </React.Fragment>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-sm text-gray-600">
              <span>Basic Info</span>
              <span>Template</span>
              <span>Team & Details</span>
              <span>Review</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Investigation Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.title ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter investigation title"
                  />
                  {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Investigation Type *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as InvestigationType }))}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.type ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    {INVESTIGATION_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                  {errors.type && <p className="mt-1 text-sm text-red-600">{errors.type}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority *
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as Priority }))}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.priority ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    {PRIORITIES.map(priority => (
                      <option key={priority.value} value={priority.value}>{priority.label}</option>
                    ))}
                  </select>
                  {errors.priority && <p className="mt-1 text-sm text-red-600">{errors.priority}</p>}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={4}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.description ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Describe the investigation scope and objectives"
                  />
                  {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={formData.dueDate || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value || undefined }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Template Selection */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Investigation Template</h3>

              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    id="use-template"
                    name="workflow-type"
                    checked={!formData.customWorkflow}
                    onChange={() => setFormData(prev => ({ ...prev, customWorkflow: false }))}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="use-template" className="text-sm font-medium text-gray-700">
                    Use existing template
                  </label>
                </div>

                {!formData.customWorkflow && (
                  <div className="ml-6 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {templates
                        .filter(template => template.type === formData.type && template.isActive)
                        .map(template => (
                          <div
                            key={template.id}
                            className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                              formData.templateId === template.id
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => setFormData(prev => ({ ...prev, templateId: template.id }))}
                          >
                            <h4 className="font-medium text-gray-900">{template.name}</h4>
                            <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                            <div className="flex items-center justify-between mt-3 text-sm text-gray-500">
                              <span>{template.steps.length} steps</span>
                              <span>~{Math.round(template.estimatedDuration / 60)} hours</span>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {template.tags.slice(0, 3).map(tag => (
                                <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                  {tag}
                                </span>
                              ))}
                              {template.tags.length > 3 && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                  +{template.tags.length - 3}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                    {errors.template && <p className="text-sm text-red-600">{errors.template}</p>}
                  </div>
                )}

                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    id="custom-workflow"
                    name="workflow-type"
                    checked={formData.customWorkflow}
                    onChange={() => setFormData(prev => ({ ...prev, customWorkflow: true, templateId: undefined }))}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="custom-workflow" className="text-sm font-medium text-gray-700">
                    Create custom workflow
                  </label>
                </div>

                {formData.customWorkflow && (
                  <div className="ml-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      You'll be able to add custom investigation steps after creating the investigation.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Team and Details */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Team Assignment & Details</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lead Investigator *
                  </label>
                  <select
                    value={formData.leadInvestigator}
                    onChange={(e) => setFormData(prev => ({ ...prev, leadInvestigator: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.leadInvestigator ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value={currentUserId}>{currentUserName} (You)</option>
                    {availableCollaborators
                      .filter(c => c.role === 'lead_investigator' || c.role === 'investigator')
                      .map(collaborator => (
                        <option key={collaborator.id} value={collaborator.id}>
                          {collaborator.name}
                        </option>
                      ))}
                  </select>
                  {errors.leadInvestigator && <p className="mt-1 text-sm text-red-600">{errors.leadInvestigator}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.category ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="e.g., Financial Crime, Data Security"
                  />
                  {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confidentiality Level
                  </label>
                  <select
                    value={formData.confidentialityLevel}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      confidentialityLevel: e.target.value as 'public' | 'internal' | 'confidential' | 'restricted'
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {CONFIDENTIALITY_LEVELS.map(level => (
                      <option key={level.value} value={level.value}>{level.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Jurisdiction
                  </label>
                  <input
                    type="text"
                    value={formData.jurisdiction || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, jurisdiction: e.target.value || undefined }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., California, EU, Global"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Team Members
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {availableCollaborators.map(collaborator => (
                      <div key={collaborator.id} className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id={`collaborator-${collaborator.id}`}
                          checked={formData.selectedCollaborators.includes(collaborator.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData(prev => ({
                                ...prev,
                                selectedCollaborators: [...prev.selectedCollaborators, collaborator.id]
                              }));
                            } else {
                              setFormData(prev => ({
                                ...prev,
                                selectedCollaborators: prev.selectedCollaborators.filter(id => id !== collaborator.id)
                              }));
                            }
                          }}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor={`collaborator-${collaborator.id}`} className="flex-1 text-sm">
                          <span className="font-medium">{collaborator.name}</span>
                          <span className="text-gray-500 ml-2">({collaborator.role.replace('_', ' ')})</span>
                          <span className="text-gray-500 ml-2">{collaborator.department}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      placeholder="Add tag"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={addTag}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Review & Create</h3>

              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Title:</span>
                    <span className="ml-2">{formData.title}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Type:</span>
                    <span className="ml-2">{INVESTIGATION_TYPES.find(t => t.value === formData.type)?.label}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Priority:</span>
                    <span className="ml-2">{PRIORITIES.find(p => p.value === formData.priority)?.label}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Template:</span>
                    <span className="ml-2">
                      {formData.customWorkflow ? 'Custom Workflow' : selectedTemplate?.name || 'None'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Lead Investigator:</span>
                    <span className="ml-2">
                      {formData.leadInvestigator === currentUserId
                        ? currentUserName
                        : availableCollaborators.find(c => c.id === formData.leadInvestigator)?.name
                      }
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Team Size:</span>
                    <span className="ml-2">{formData.selectedCollaborators.length + 1} members</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Category:</span>
                    <span className="ml-2">{formData.category}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Confidentiality:</span>
                    <span className="ml-2">{formData.confidentialityLevel}</span>
                  </div>
                </div>

                <div>
                  <span className="font-medium text-gray-700">Description:</span>
                  <p className="mt-1 text-gray-600">{formData.description}</p>
                </div>

                {formData.tags.length > 0 && (
                  <div>
                    <span className="font-medium text-gray-700">Tags:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {formData.tags.map(tag => (
                        <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedTemplate && (
                  <div>
                    <span className="font-medium text-gray-700">Template Steps:</span>
                    <div className="mt-2 space-y-1">
                      {selectedTemplate.steps.slice(0, 5).map((step, index) => (
                        <div key={index} className="text-sm text-gray-600">
                          {index + 1}. {step.title}
                        </div>
                      ))}
                      {selectedTemplate.steps.length > 5 && (
                        <div className="text-sm text-gray-500">
                          ...and {selectedTemplate.steps.length - 5} more steps
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            {currentStep < totalSteps ? (
              <button
                onClick={handleNext}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Create Investigation
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
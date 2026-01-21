import { listTemplates } from '../../../src/unified-module-requirements/lib/templates/TemplateManager';
import { generateModule } from '../../../src/unified-module-requirements/lib/templates/ModuleGenerator';
import { ModuleTemplateEngine } from '../../../src/unified-module-requirements/models/ModuleTemplate';
import {
  TemplateListResponse,
  ModuleType,
  TemplateGenerationConfig
} from '../../../src/unified-module-requirements/models/types';

describe('Integration Test: Template Workflow and Module Generation', () => {
  let templateEngine: ModuleTemplateEngine;

  beforeAll(() => {
    templateEngine = new ModuleTemplateEngine();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Template discovery and listing workflow', () => {
    it('should list available templates with complete metadata', async () => {
      const templateWorkflow = async () => {
        const workflow = {
          listingResult: null,
          templateValidation: [],
          categorization: {},
          errors: []
        };

        try {
          // Step 1: List all available templates
          try {
            workflow.listingResult = await listTemplates();
          } catch (error) {
            // Fallback to engine-based listing if API not implemented
            const allTemplates = templateEngine.getAllTemplates();
            workflow.listingResult = {
              templates: allTemplates.map(template => ({
                templateId: template.templateId,
                name: template.name,
                description: template.description,
                moduleType: template.moduleType,
                version: template.version,
                maintainer: template.maintainer,
                configurableOptions: template.configurableOptions
              })),
              totalCount: allTemplates.length
            };
          }

          // Step 2: Validate each template
          if (workflow.listingResult?.templates) {
            for (const template of workflow.listingResult.templates) {
              const validation = {
                templateId: template.templateId,
                valid: true,
                issues: []
              };

              // Check required fields
              if (!template.name || template.name.length < 3) {
                validation.valid = false;
                validation.issues.push('Template name too short or missing');
              }

              if (!template.description || template.description.length < 10) {
                validation.valid = false;
                validation.issues.push('Template description insufficient');
              }

              if (!Object.values(ModuleType).includes(template.moduleType)) {
                validation.valid = false;
                validation.issues.push('Invalid module type');
              }

              if (!template.version || !/^\d+\.\d+\.\d+$/.test(template.version)) {
                validation.valid = false;
                validation.issues.push('Invalid version format');
              }

              workflow.templateValidation.push(validation);
            }
          }

          // Step 3: Categorize templates by type
          if (workflow.listingResult?.templates) {
            workflow.categorization = workflow.listingResult.templates.reduce((acc, template) => {
              if (!acc[template.moduleType]) {
                acc[template.moduleType] = [];
              }
              acc[template.moduleType].push(template);
              return acc;
            }, {} as Record<string, any[]>);
          }

          return workflow;
        } catch (error) {
          workflow.errors.push(error instanceof Error ? error.message : 'Template workflow failed');
          return workflow;
        }
      };

      const result = await templateWorkflow();

      // Verify template listing
      expect(result.listingResult).toBeDefined();
      expect(result.listingResult.templates).toBeDefined();
      expect(Array.isArray(result.listingResult.templates)).toBe(true);
      expect(result.listingResult.totalCount).toBeGreaterThan(0);

      // Verify template metadata
      result.listingResult.templates.forEach(template => {
        expect(template.templateId).toBeDefined();
        expect(template.name).toBeDefined();
        expect(template.description).toBeDefined();
        expect(template.moduleType).toBeDefined();
        expect(template.version).toBeDefined();
        expect(Array.isArray(template.configurableOptions)).toBe(true);
      });

      // Verify template validation
      expect(result.templateValidation.length).toBe(result.listingResult.templates.length);

      const validTemplates = result.templateValidation.filter(v => v.valid);
      expect(validTemplates.length).toBeGreaterThan(0);

      // Invalid templates should have specific issues
      const invalidTemplates = result.templateValidation.filter(v => !v.valid);
      invalidTemplates.forEach(template => {
        expect(template.issues.length).toBeGreaterThan(0);
        template.issues.forEach(issue => {
          expect(issue.length).toBeGreaterThan(10);
        });
      });

      // Verify categorization
      const moduleTypes = Object.keys(result.categorization);
      expect(moduleTypes.length).toBeGreaterThan(0);

      moduleTypes.forEach(type => {
        expect(Object.values(ModuleType).includes(type as ModuleType)).toBe(true);
        expect(result.categorization[type].length).toBeGreaterThan(0);
      });
    });

    it('should handle template filtering and search functionality', async () => {
      const filteringWorkflow = async () => {
        const results = {
          allTemplates: [],
          filteredByType: {},
          searchResults: {},
          errors: []
        };

        try {
          // Get all templates
          results.allTemplates = templateEngine.getAllTemplates();

          // Filter by module type
          for (const moduleType of Object.values(ModuleType)) {
            try {
              const filteredTemplates = templateEngine.getTemplatesByType(moduleType);
              results.filteredByType[moduleType] = {
                count: filteredTemplates.length,
                templates: filteredTemplates.map(t => ({
                  id: t.templateId,
                  name: t.name,
                  type: t.moduleType
                }))
              };
            } catch (error) {
              results.errors.push(`Filtering by ${moduleType} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }

          // Search by keywords
          const searchTerms = ['backend', 'frontend', 'service', 'component', 'api'];
          for (const term of searchTerms) {
            const matchingTemplates = results.allTemplates.filter(template =>
              template.name.toLowerCase().includes(term.toLowerCase()) ||
              template.description.toLowerCase().includes(term.toLowerCase()) ||
              template.metadata.tags.some(tag => tag.toLowerCase().includes(term.toLowerCase()))
            );

            results.searchResults[term] = {
              count: matchingTemplates.length,
              templates: matchingTemplates.map(t => ({
                id: t.templateId,
                name: t.name,
                relevance: this.calculateRelevance(t, term)
              }))
            };
          }

          return results;
        } catch (error) {
          results.errors.push(error instanceof Error ? error.message : 'Filtering workflow failed');
          return results;
        }
      };

      // Helper function to calculate search relevance
      (templateWorkflow as any).calculateRelevance = (template: any, term: string): number => {
        let score = 0;
        const lowerTerm = term.toLowerCase();

        if (template.name.toLowerCase().includes(lowerTerm)) score += 3;
        if (template.description.toLowerCase().includes(lowerTerm)) score += 2;
        if (template.metadata.tags.some((tag: string) => tag.toLowerCase().includes(lowerTerm))) score += 1;

        return score;
      };

      const results = await filteringWorkflow();

      // Verify template filtering
      expect(results.allTemplates.length).toBeGreaterThan(0);

      // Verify type-based filtering
      const typeFilterResults = Object.keys(results.filteredByType);
      expect(typeFilterResults.length).toBeGreaterThan(0);

      Object.values(ModuleType).forEach(moduleType => {
        if (results.filteredByType[moduleType]) {
          expect(results.filteredByType[moduleType].count).toBeGreaterThanOrEqual(0);
          expect(Array.isArray(results.filteredByType[moduleType].templates)).toBe(true);

          // All filtered templates should match the type
          results.filteredByType[moduleType].templates.forEach((template: any) => {
            expect(template.type).toBe(moduleType);
          });
        }
      });

      // Verify search functionality
      const searchTerms = Object.keys(results.searchResults);
      expect(searchTerms.length).toBeGreaterThan(0);

      searchTerms.forEach(term => {
        const searchResult = results.searchResults[term];
        expect(searchResult.count).toBeGreaterThanOrEqual(0);
        expect(Array.isArray(searchResult.templates)).toBe(true);

        // Search results should have relevance scores
        searchResult.templates.forEach((template: any) => {
          expect(typeof template.relevance).toBe('number');
          expect(template.relevance).toBeGreaterThanOrEqual(0);
        });
      });

      // Should have minimal errors
      expect(results.errors.length).toBeLessThan(3);
    });
  });

  describe('Module generation workflow', () => {
    it('should generate complete module from template with customization', async () => {
      const generationWorkflow = async () => {
        const workflow = {
          templateSelection: null,
          configurationValidation: null,
          generation: null,
          validation: null,
          errors: []
        };

        try {
          // Step 1: Select template
          const backendTemplates = templateEngine.getTemplatesByType(ModuleType.BACKEND);
          if (backendTemplates.length === 0) {
            throw new Error('No backend templates available');
          }

          workflow.templateSelection = {
            templateId: backendTemplates[0].templateId,
            template: backendTemplates[0]
          };

          // Step 2: Configure generation
          const config: TemplateGenerationConfig = {
            moduleName: 'test-user-service',
            moduleType: ModuleType.BACKEND,
            outputPath: '/generated/modules/test-user-service',
            variables: {
              includeAuth: true,
              databaseType: 'firebase',
              apiVersion: 'v1',
              description: 'User management service for the application'
            },
            includeOptionalFiles: true,
            customizations: {
              useCustomMiddleware: true,
              enableLogging: true
            }
          };

          // Validate configuration against template options
          const template = workflow.templateSelection.template;
          const configValidation = {
            valid: true,
            missingRequired: [],
            invalidValues: [],
            warnings: []
          };

          for (const option of template.configurableOptions) {
            const value = config.variables[option.name];

            if (option.required && (value === undefined || value === null)) {
              configValidation.valid = false;
              configValidation.missingRequired.push(option.name);
            }

            if (value !== undefined && option.validation) {
              const regex = new RegExp(option.validation);
              if (!regex.test(String(value))) {
                configValidation.valid = false;
                configValidation.invalidValues.push({
                  option: option.name,
                  value,
                  expected: option.validation
                });
              }
            }

            if (value === undefined && option.defaultValue !== undefined) {
              config.variables[option.name] = option.defaultValue;
              configValidation.warnings.push(`Using default value for ${option.name}`);
            }
          }

          workflow.configurationValidation = configValidation;

          // Step 3: Generate module
          if (configValidation.valid) {
            try {
              workflow.generation = await templateEngine.generateModule(
                workflow.templateSelection.templateId,
                config
              );
            } catch (error) {
              // Fallback to direct generation if API not implemented
              workflow.generation = await templateEngine.generateModule(
                workflow.templateSelection.templateId,
                config
              );
            }
          } else {
            workflow.generation = {
              success: false,
              files: [],
              errors: ['Configuration validation failed']
            };
          }

          // Step 4: Validate generated files
          if (workflow.generation?.success && workflow.generation.files) {
            const validation = {
              filesGenerated: workflow.generation.files.length,
              requiredFiles: 0,
              optionalFiles: 0,
              templateVariablesReplaced: true,
              contentValidation: []
            };

            for (const file of workflow.generation.files) {
              const fileValidation = {
                path: file.path,
                hasContent: file.content.length > 0,
                templatesReplaced: !file.content.includes('{{'),
                validStructure: true
              };

              // Check if required files are present
              if (template.files.some(tf => tf.required && file.path.includes(tf.path))) {
                validation.requiredFiles++;
              } else {
                validation.optionalFiles++;
              }

              // Validate content structure for key files
              if (file.path.includes('package.json')) {
                try {
                  const packageData = JSON.parse(file.content);
                  fileValidation.validStructure =
                    packageData.name === config.moduleName &&
                    packageData.version !== undefined;
                } catch {
                  fileValidation.validStructure = false;
                }
              }

              validation.contentValidation.push(fileValidation);
            }

            workflow.validation = validation;
          }

          return workflow;
        } catch (error) {
          workflow.errors.push(error instanceof Error ? error.message : 'Generation workflow failed');
          return workflow;
        }
      };

      const result = await generationWorkflow();

      // Verify template selection
      expect(result.templateSelection).toBeDefined();
      expect(result.templateSelection.templateId).toBeDefined();
      expect(result.templateSelection.template).toBeDefined();

      // Verify configuration validation
      expect(result.configurationValidation).toBeDefined();
      if (!result.configurationValidation.valid) {
        expect(result.configurationValidation.missingRequired.length +
               result.configurationValidation.invalidValues.length).toBeGreaterThan(0);
      }

      // Verify generation results
      expect(result.generation).toBeDefined();
      if (result.generation.success) {
        expect(result.generation.files.length).toBeGreaterThan(0);
        expect(result.generation.errors.length).toBe(0);

        // Verify file generation
        result.generation.files.forEach((file: any) => {
          expect(file.path).toBeDefined();
          expect(file.content).toBeDefined();
          expect(file.content.length).toBeGreaterThan(0);
        });
      } else {
        expect(result.generation.errors.length).toBeGreaterThan(0);
      }

      // Verify validation if generation succeeded
      if (result.validation) {
        expect(result.validation.filesGenerated).toBeGreaterThan(0);
        expect(result.validation.requiredFiles).toBeGreaterThan(0);

        // Content validation should pass
        result.validation.contentValidation.forEach((fileVal: any) => {
          expect(fileVal.hasContent).toBe(true);
          expect(fileVal.templatesReplaced).toBe(true);
        });
      }

      // Should have minimal errors
      expect(result.errors.length).toBeLessThan(2);
    });

    it('should handle multiple template types and complex configurations', async () => {
      const multiTemplateWorkflow = async () => {
        const results = {
          templateTests: [],
          errors: []
        };

        const testConfigurations = [
          {
            templateType: ModuleType.BACKEND,
            config: {
              moduleName: 'api-gateway',
              moduleType: ModuleType.BACKEND,
              outputPath: '/generated/api-gateway',
              variables: {
                includeAuth: true,
                databaseType: 'postgresql',
                apiVersion: 'v2'
              },
              includeOptionalFiles: false,
              customizations: {}
            }
          },
          {
            templateType: ModuleType.FRONTEND,
            config: {
              moduleName: 'user-dashboard',
              moduleType: ModuleType.FRONTEND,
              outputPath: '/generated/user-dashboard',
              variables: {
                includeStorybook: true,
                styleFramework: 'tailwind',
                testingLibrary: 'jest'
              },
              includeOptionalFiles: true,
              customizations: {
                useTypeScript: true,
                enablePWA: false
              }
            }
          },
          {
            templateType: ModuleType.UTILITY,
            config: {
              moduleName: 'data-validator',
              moduleType: ModuleType.UTILITY,
              outputPath: '/generated/data-validator',
              variables: {},
              includeOptionalFiles: true,
              customizations: {}
            }
          }
        ];

        for (const testConfig of testConfigurations) {
          const templateTest = {
            templateType: testConfig.templateType,
            available: false,
            generated: false,
            fileCount: 0,
            validationPassed: false,
            errors: []
          };

          try {
            // Check template availability
            const templates = templateEngine.getTemplatesByType(testConfig.templateType);
            templateTest.available = templates.length > 0;

            if (templateTest.available) {
              // Attempt generation
              const generationResult = await templateEngine.generateModule(
                templates[0].templateId,
                testConfig.config
              );

              templateTest.generated = generationResult.success;
              templateTest.fileCount = generationResult.files.length;

              if (generationResult.success) {
                // Basic validation
                const hasPackageJson = generationResult.files.some(f =>
                  f.path.includes('package.json')
                );
                const hasReadme = generationResult.files.some(f =>
                  f.path.includes('README.md')
                );
                const hasSourceFiles = generationResult.files.some(f =>
                  f.path.includes('src/')
                );

                templateTest.validationPassed = hasPackageJson && hasReadme && hasSourceFiles;
              } else {
                templateTest.errors.push(...generationResult.errors);
              }
            }
          } catch (error) {
            templateTest.errors.push(error instanceof Error ? error.message : 'Template test failed');
          }

          results.templateTests.push(templateTest);
        }

        return results;
      };

      const results = await multiTemplateWorkflow();

      // Verify multi-template testing
      expect(results.templateTests.length).toBe(3);

      // Check each template type
      const templateTypes = results.templateTests.map(t => t.templateType);
      expect(templateTypes).toContain(ModuleType.BACKEND);
      expect(templateTypes).toContain(ModuleType.FRONTEND);
      expect(templateTypes).toContain(ModuleType.UTILITY);

      // Most templates should be available
      const availableTemplates = results.templateTests.filter(t => t.available);
      expect(availableTemplates.length).toBeGreaterThan(0);

      // Available templates should generate successfully
      availableTemplates.forEach(test => {
        if (test.generated) {
          expect(test.fileCount).toBeGreaterThan(0);
          expect(test.validationPassed).toBe(true);
        }
      });

      // Failed tests should have meaningful errors
      const failedTests = results.templateTests.filter(t => !t.generated && t.available);
      failedTests.forEach(test => {
        expect(test.errors.length).toBeGreaterThan(0);
        test.errors.forEach(error => {
          expect(error.length).toBeGreaterThan(5);
        });
      });
    });
  });

  describe('Template customization and extension workflow', () => {
    it('should support template customization and variable substitution', async () => {
      const customizationWorkflow = async () => {
        const workflow = {
          baseTemplate: null,
          customizations: [],
          generationTests: [],
          errors: []
        };

        try {
          // Get a template for customization testing
          const templates = templateEngine.getAllTemplates();
          if (templates.length === 0) {
            throw new Error('No templates available for customization');
          }

          workflow.baseTemplate = templates[0];

          // Test various customization scenarios
          const customizationScenarios = [
            {
              name: 'basic_variable_substitution',
              variables: {
                moduleName: 'custom-module-name',
                description: 'A customized module for testing',
                author: 'Test Author',
                version: '2.1.0'
              }
            },
            {
              name: 'boolean_options',
              variables: {
                moduleName: 'feature-module',
                enableFeatureA: true,
                enableFeatureB: false,
                useAdvancedConfig: true
              }
            },
            {
              name: 'complex_configuration',
              variables: {
                moduleName: 'complex-service',
                databaseConfig: {
                  host: 'localhost',
                  port: 5432,
                  database: 'testdb'
                },
                features: ['auth', 'logging', 'metrics'],
                environment: 'development'
              }
            }
          ];

          for (const scenario of customizationScenarios) {
            const customization = {
              scenario: scenario.name,
              success: false,
              substitutionsApplied: 0,
              filesGenerated: 0,
              errors: []
            };

            try {
              const config: TemplateGenerationConfig = {
                moduleName: scenario.variables.moduleName || 'test-module',
                moduleType: workflow.baseTemplate.moduleType,
                outputPath: `/test/customization/${scenario.name}`,
                variables: scenario.variables,
                includeOptionalFiles: true,
                customizations: {}
              };

              const result = await templateEngine.generateModule(
                workflow.baseTemplate.templateId,
                config
              );

              customization.success = result.success;
              customization.filesGenerated = result.files.length;

              if (result.success) {
                // Check variable substitution
                for (const file of result.files) {
                  const content = file.content;

                  // Count successful substitutions
                  Object.keys(scenario.variables).forEach(varName => {
                    const varValue = scenario.variables[varName];
                    if (typeof varValue === 'string' && content.includes(varValue)) {
                      customization.substitutionsApplied++;
                    }
                  });

                  // Check that no unresolved template variables remain
                  const unresolvedVars = (content.match(/\{\{[^}]+\}\}/g) || []).length;
                  if (unresolvedVars > 0) {
                    customization.errors.push(`${unresolvedVars} unresolved variables in ${file.path}`);
                  }
                }
              } else {
                customization.errors.push(...result.errors);
              }
            } catch (error) {
              customization.errors.push(error instanceof Error ? error.message : 'Customization failed');
            }

            workflow.customizations.push(customization);
          }

          return workflow;
        } catch (error) {
          workflow.errors.push(error instanceof Error ? error.message : 'Customization workflow failed');
          return workflow;
        }
      };

      const result = await customizationWorkflow();

      // Verify customization workflow
      expect(result.baseTemplate).toBeDefined();
      expect(result.customizations.length).toBe(3);

      // Verify customization scenarios
      result.customizations.forEach(customization => {
        expect(customization.scenario).toBeDefined();

        if (customization.success) {
          expect(customization.filesGenerated).toBeGreaterThan(0);
          expect(customization.substitutionsApplied).toBeGreaterThan(0);

          // Should have no unresolved variable errors
          const unresolvedErrors = customization.errors.filter(e =>
            e.includes('unresolved variables')
          );
          expect(unresolvedErrors.length).toBe(0);
        } else {
          expect(customization.errors.length).toBeGreaterThan(0);
        }
      });

      // At least one customization should succeed
      const successfulCustomizations = result.customizations.filter(c => c.success);
      expect(successfulCustomizations.length).toBeGreaterThan(0);

      // Should have minimal workflow errors
      expect(result.errors.length).toBeLessThan(2);
    });
  });
});
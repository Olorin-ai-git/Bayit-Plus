export const TemplateRegistry = {
  getTemplate: (id: string) => ({ id, name: 'Template ' + id }),
  listTemplates: () => [],
  registerTemplate: (template: any) => {}
};

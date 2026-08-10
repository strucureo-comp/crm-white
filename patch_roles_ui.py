import re

with open('app/(dashboard)/team/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

roles_ui = """        {/* Roles Tab */}
        <TabsContent value="roles" className="space-y-4">
          <div className="flex flex-col md:flex-row gap-6">
            <Card className="w-full md:w-64 shrink-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Roles
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="flex flex-col">
                  {roles.map(role => (
                    <button
                      key={role.id}
                      onClick={() => setSelectedRoleId(role.id)}
                      className={`text-left px-4 py-3 text-sm transition-colors border-l-2 hover:bg-muted/50 ${
                        selectedRoleId === role.id 
                          ? 'border-primary bg-primary/5 font-medium text-primary' 
                          : 'border-transparent text-muted-foreground'
                      }`}
                    >
                      {role.name}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="flex-1">
              {editedRole ? (
                <>
                  <CardHeader className="flex flex-row items-start justify-between border-b pb-4">
                    <div>
                      <CardTitle className="text-lg">{editedRole.name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {editedRole.description || 'Configure access levels for this role'}
                      </p>
                    </div>
                    <Button 
                      onClick={handleSaveRole} 
                      disabled={saveState === 'saving' || saveState === 'saved'}
                    >
                      {saveState === 'saving' ? (
                        <Activity className="w-4 h-4 mr-2 animate-spin" />
                      ) : saveState === 'saved' ? (
                        <Check className="w-4 h-4 mr-2 text-green-500" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      {saveState === 'saved' ? 'Saved' : 'Save Changes'}
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          <th className="p-4 text-sm font-medium">Module</th>
                          <th className="p-4 text-sm font-medium text-center">View</th>
                          <th className="p-4 text-sm font-medium text-center">Edit</th>
                          <th className="p-4 text-sm font-medium text-center">Delete</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {MODULE_NAMES.map(mod => {
                          const perms = editedRole.permissions[mod] || { view: false, edit: false, delete: false };
                          const canView = perms.view;
                          const canEdit = perms.edit;
                          const canDelete = perms.delete;

                          return (
                            <tr key={mod} className="hover:bg-muted/30 transition-colors">
                              <td className="p-4 text-sm font-medium capitalize">
                                {MODULE_LABELS[mod] || mod}
                              </td>
                              <td className="p-4 text-center">
                                <button
                                  onClick={() => togglePermission(mod, 'v')}
                                  className={`w-6 h-6 rounded-full inline-flex items-center justify-center border transition-colors ${
                                    canView ? 'bg-primary border-primary text-primary-foreground' : 'border-input hover:border-primary/50'
                                  }`}
                                >
                                  {canView && <Check size={12} />}
                                </button>
                              </td>
                              <td className="p-4 text-center">
                                <button
                                  onClick={() => togglePermission(mod, 'e')}
                                  className={`w-6 h-6 rounded-full inline-flex items-center justify-center border transition-colors ${
                                    canEdit ? 'bg-primary border-primary text-primary-foreground' : 'border-input hover:border-primary/50'
                                  }`}
                                >
                                  {canEdit && <Check size={12} />}
                                </button>
                              </td>
                              <td className="p-4 text-center">
                                <button
                                  onClick={() => togglePermission(mod, 'd')}
                                  className={`w-6 h-6 rounded-full inline-flex items-center justify-center border transition-colors ${
                                    canDelete ? 'bg-destructive border-destructive text-destructive-foreground' : 'border-input hover:border-destructive/50'
                                  }`}
                                >
                                  {canDelete && <Check size={12} />}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </CardContent>
                </>
              ) : (
                <div className="h-full min-h-[400px] flex items-center justify-center text-muted-foreground">
                  Select a role to edit its permissions
                </div>
              )}
            </Card>
          </div>
        </TabsContent>"""

content = re.sub(r"\{\/\* Roles Tab \*\/\}.*?\{\/\* Activity Tab \*\/\}", roles_ui + "\n\n        {/* Activity Tab */}", content, flags=re.DOTALL)

with open('app/(dashboard)/team/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

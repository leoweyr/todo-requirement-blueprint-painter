import { Component, type ReactNode, type CSSProperties, type ChangeEvent } from 'react';


export interface FileOpenModalProps {
    onFileSelected: (fileContent: string, fileName: string) => void;
    onCreateNew: (name: string, trbVersion: string) => void;
}


interface FileOpenModalState {
    isCreatingNew: boolean;
    newBlueprintName: string;
    selectedVersion: string;
    availableVersions: string[];
    isLoadingVersions: boolean;
}


class FileOpenModal extends Component<FileOpenModalProps, FileOpenModalState> {
    private _fileInput: HTMLInputElement | null = null;

    private handleCreateClick: () => void = (): void => {
        const { newBlueprintName, selectedVersion } = this.state;

        if (newBlueprintName && selectedVersion) {
            this.props.onCreateNew(newBlueprintName, selectedVersion);
        }
    };

    private handleCreateNewClick: () => void = (): void => {
        this.setState({ isCreatingNew: true });
    };

    private handleCancelClick: () => void = (): void => {
        this.setState({ isCreatingNew: false });
    };

    private handleNameChange: (e: ChangeEvent<HTMLInputElement>) => void = (e: ChangeEvent<HTMLInputElement>): void => {
        this.setState({ newBlueprintName: e.target.value });
    };

    private handleVersionChange: (e: ChangeEvent<HTMLSelectElement>) => void = (e: ChangeEvent<HTMLSelectElement>): void => {
        this.setState({ selectedVersion: e.target.value });
    };

    private handleInputReference: (reference: HTMLInputElement | null) => void = (reference: HTMLInputElement | null): void => {
        this._fileInput = reference;
    };

    private handleButtonClick: () => void = (): void => {
        if (this._fileInput) {
            this._fileInput.click();
        }
    };

    private handleFileChange: (event: ChangeEvent<HTMLInputElement>) => void = (event: ChangeEvent<HTMLInputElement>): void => {
        const file: File | undefined = event.target.files?.[0];

        if (!file) return;

        const reader: FileReader = new FileReader();

        reader.onload = (readerEvent: ProgressEvent<FileReader>): void => {
            const content: string | ArrayBuffer | null | undefined = readerEvent.target?.result;

            if (typeof content === 'string') {
                this.props.onFileSelected(content, file.name);
            }
        };

        reader.readAsText(file);
        
        // Reset input value so the same file can be selected again if needed.
        event.target.value = '';
    };

    constructor(props: FileOpenModalProps) {
        super(props);

        this.state = {
            isCreatingNew: false,
            newBlueprintName: 'Untitled Blueprint',
            selectedVersion: '',
            availableVersions: [],
            isLoadingVersions: false
        };
    }

    public componentDidMount(): void {
        this.fetchVersions();
    }

    public render(): ReactNode {
        const { isCreatingNew } = this.state;

        return (
            <div style={this.getContainerStyle()}>
                <h2 style={this.getTitleStyle()}>{isCreatingNew ? 'Create New Blueprint' : 'Open Diagram'}</h2>
                
                {isCreatingNew ? this.renderCreateForm() : this.renderInitialOptions()}

                <input 
                    type="file" 
                    ref={this.handleInputReference}
                    style={{ display: 'none' }}
                    accept=".yaml,.json"
                    onChange={this.handleFileChange}
                />
            </div>
        );
    }

    private async fetchVersions(): Promise<void> {
        this.setState({ isLoadingVersions: true });

        try {
            const controller: AbortController = new AbortController();
            const timeoutId: number = setTimeout((): void => controller.abort(), 5000);

            // Explicitly type headers as HeadersInit or a Record<string, string> compatible with fetch.
            const headers: Record<string, string> = {};

            // Access env variable safely.
            const token: string | undefined = import.meta.env.APP_GITHUB_TOKEN;

            if (token) {
                headers['Authorization'] = `token ${token}`;
            }

            const response: Response = await fetch(
                'https://api.github.com/repos/leoweyr/todo-requirement-blueprint-spec/contents/schemas?ref=master',
                { 
                    signal: controller.signal,
                    headers: headers
                }
            );
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                const message: string = `GitHub API failed: ${response.status} ${response.statusText}`;
                console.error(message);
                throw new Error(message);
            }
            
            const data: any = await response.json();
            
            if (!Array.isArray(data)) {
                 throw new Error('Invalid API response format');
            }

            // Filter for directories and extract names, removing 'v' prefix.
            const versions: string[] = data
                .filter((item: any): boolean => item.type === 'dir')
                .map((item: any): string => item.name.replace(/^v/, ''))
                .sort((versionA: string, versionB: string): number => versionB.localeCompare(versionA));

            if (versions.length > 0) {
                this.setState({ 
                    availableVersions: versions,
                    selectedVersion: versions[0],
                    isLoadingVersions: false 
                });
            } else {
                 throw new Error('No versions found in API response.');
            }
        } catch (error) {
            console.error('Error fetching versions:', error);
            
            this.setState({ 
                availableVersions: [],
                selectedVersion: '',
                isLoadingVersions: false 
            });

            alert(`Failed to fetch TRB versions: ${(error as Error).message}`);
        }
    }

    private renderInitialOptions(): ReactNode {
        return (
            <>
                <p style={this.getDescriptionStyle()}>
                    Please select an action to proceed.
                </p>

                <div style={this.getButtonGroupStyle()}>
                    <button 
                        style={this.getButtonStyle()}
                        onClick={this.handleButtonClick}
                    >
                        Open File
                    </button>
                    <button 
                        style={{...this.getButtonStyle(), backgroundColor: '#34C759'}}
                        onClick={this.handleCreateNewClick}
                    >
                        Create New
                    </button>
                </div>
            </>
        );
    }

    private renderCreateForm(): ReactNode {
        const { newBlueprintName, selectedVersion, availableVersions, isLoadingVersions } = this.state;

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', textAlign: 'left' }}>
                <div>
                    <label style={this.getLabelStyle()}>Blueprint Name</label>
                    <input 
                        type="text" 
                        value={newBlueprintName}
                        onChange={this.handleNameChange}
                        style={this.getInputStyle()}
                    />
                </div>

                <div>
                    <label style={this.getLabelStyle()}>TRB Version</label>
                    <select 
                        value={selectedVersion}
                        onChange={this.handleVersionChange}
                        style={this.getInputStyle()}
                        disabled={isLoadingVersions}
                    >
                        {isLoadingVersions ? (
                            <option>Loading versions...</option>
                        ) : (
                            availableVersions.map((version: string): ReactNode => (
                                <option key={version} value={version}>{version}</option>
                            ))
                        )}
                    </select>
                </div>

                <div style={{...this.getButtonGroupStyle(), justifyContent: 'space-between', marginTop: '20px'}}>
                     <button 
                        style={{...this.getButtonStyle(), backgroundColor: '#8E8E93'}}
                        onClick={this.handleCancelClick}
                    >
                        Cancel
                    </button>
                    <button 
                        style={this.getButtonStyle()}
                        onClick={this.handleCreateClick}
                        disabled={!selectedVersion || !newBlueprintName}
                    >
                        Create
                    </button>
                </div>
            </div>
        );
    }

    private getContainerStyle(): CSSProperties {
        return {
            backgroundColor: '#ffffff',
            padding: '40px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            width: '400px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
        };
    }

    private getTitleStyle(): CSSProperties {
        return {
            margin: 0,
            fontSize: '24px',
            fontWeight: 600,
            color: '#333333'
        };
    }

    private getDescriptionStyle(): CSSProperties {
        return {
            margin: 0,
            fontSize: '14px',
            color: '#666666',
            lineHeight: '1.5'
        };
    }

    private getButtonGroupStyle(): CSSProperties {
        return {
            marginTop: '10px',
            display: 'flex',
            justifyContent: 'center'
        };
    }

    private getButtonStyle(): CSSProperties {
        return {
            padding: '10px 24px',
            backgroundColor: '#007AFF',  // iOS blue-ish.
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background-color 0.2s ease',
            outline: 'none',
            flex: 1,
            margin: '0 5px'
        };
    }

    private getLabelStyle(): CSSProperties {
        return {
            display: 'block',
            marginBottom: '5px',
            fontSize: '14px',
            fontWeight: 600,
            color: '#333333'
        };
    }

    private getInputStyle(): CSSProperties {
        return {
            width: '100%',
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid #CCCCCC',
            fontSize: '14px',
            boxSizing: 'border-box'
        };
    }
}


export default FileOpenModal;

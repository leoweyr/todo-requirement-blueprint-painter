import { Component, type ReactNode, type CSSProperties, type ChangeEvent } from 'react';

import { DomainRegistry } from '../../../features/registry/DomainRegistry';
import { BlueprintPrerenderComb } from '../../../features/graph/BlueprintPrerenderComb';
import { CanvasViewport } from '../../canvas/viewport/CanvasViewport';
import { type BlueprintPrerenderCombResult } from '../../../features/graph/BlueprintPrerenderCombResult';
import { BlueprintSerializer } from '../../../features/serializer/BlueprintSerializer';
import { GitHubClient } from '../../../features/github/GitHubClient';
import { type GitHubRepository } from '../../../features/github/GitHubRepository';
import { type TrbManifest, type TrbManifestBlueprint } from '../../../features/github/TrbManifest';
import { NodeHistoryTracker } from '../../../features/node-history/NodeHistoryTracker';
import { FileOpenModalView } from './enums/FileOpenModalView.ts';


export interface FileOpenModalProps {
    onFileLoaded: () => void;
    registry: DomainRegistry;
    layoutService: BlueprintPrerenderComb;
    viewport: CanvasViewport;
    onLayoutUpdate: (result: BlueprintPrerenderCombResult) => void;
}


interface FileOpenModalState {
    currentView: FileOpenModalView;
    newBlueprintName: string;
    selectedVersion: string;
    availableVersions: string[];
    isLoadingVersions: boolean;
    
    // GitHub State.
    gitHubToken: string;
    repositories: GitHubRepository[];
    selectedRepositoryIdentifier: string;
    repositoryFilePath: string;
    isLoadingRepositories: boolean;
    isLoadingFile: boolean;
    
    // Manifest State.
    manifest: TrbManifest | null;
    isCheckingManifest: boolean;
    manifestBlueprintPath: string;
    manifestTrbVersion: string;
}


class FileOpenModal extends Component<FileOpenModalProps, FileOpenModalState> {
    private _fileInput: HTMLInputElement | null = null;

    private _handleCreateClick: () => void = async (): Promise<void> => {
        const { newBlueprintName, selectedVersion }: FileOpenModalState = this.state;
        const { registry, layoutService, onLayoutUpdate, onFileLoaded }: FileOpenModalProps = this.props;

        if (newBlueprintName && selectedVersion) {
            registry.clear();
            registry.blueprintName = newBlueprintName;
            registry.trbVersion = selectedVersion;

            // Fetch and register the schema for the selected version.
            try {
                const versionPath: string = selectedVersion.startsWith('v') ? selectedVersion : `v${selectedVersion}`;
                const schemaUrl: string = `https://raw.githubusercontent.com/leoweyr/todo-requirement-blueprint-spec/master/schemas/${versionPath}/trb.schema.json`;
                
                const response: Response = await fetch(schemaUrl);

                if (response.ok) {
                    const schema: any = await response.json();
                    registry.schema = schema;
                } else {
                    console.error(`Failed to fetch schema: ${response.statusText}`);
                }
            } catch (error) {
                console.error("Failed to fetch schema for new blueprint", error);
            }
            
            // Reset layout.
            const result: BlueprintPrerenderCombResult = layoutService.calculateLayout(registry);
            onLayoutUpdate(result);
            
            onFileLoaded();
        }
    };

    private _handleCreateNewClick: () => void = (): void => {
        this.setState({ currentView: FileOpenModalView.CREATE_NEW });
    };

    private _handleGitHubClick: () => void = (): void => {
        // If token already exists (e.g. from env), try to use it and skip to repository select, 
        // or just go to authentication to let user confirm/change.
        this.setState({ currentView: FileOpenModalView.GITHUB_AUTHENTICATION });
    };

    private _handleCancelClick: () => void = (): void => {
        this.setState({ currentView: FileOpenModalView.INITIAL });
    };

    private _handleNameChange: (event: ChangeEvent<HTMLInputElement>) => void = (event: ChangeEvent<HTMLInputElement>): void => {
        this.setState({ newBlueprintName: event.target.value });
    };

    private _handleVersionChange: (event: ChangeEvent<HTMLSelectElement>) => void = (event: ChangeEvent<HTMLSelectElement>): void => {
        this.setState({ selectedVersion: event.target.value });
    };

    private _handleInputReference: (reference: HTMLInputElement | null) => void = (reference: HTMLInputElement | null): void => {
        this._fileInput = reference;
    };

    private _handleButtonClick: () => void = (): void => {
        if (this._fileInput) {
            this._fileInput.click();
        }
    };

    private _handleFileChange: (event: ChangeEvent<HTMLInputElement>) => void = (event: ChangeEvent<HTMLInputElement>): void => {
        const file: File | undefined = event.target.files?.[0];
        const { registry, layoutService, viewport, onLayoutUpdate, onFileLoaded }: FileOpenModalProps = this.props;

        if (!file) return;

        const reader: FileReader = new FileReader();

        reader.onload = async (readerEvent: ProgressEvent<FileReader>): Promise<void> => {
            const content: string | ArrayBuffer | null | undefined = readerEvent.target?.result;

            if (typeof content === 'string') {
                try {
                    registry.clear();
                    
                    // Remove extension from filename to get blueprint name.
                    const blueprintName: string = file.name.replace(/\.[^/.]+$/, "");

                    await BlueprintSerializer.fromYaml(content, registry, undefined, blueprintName);

                    const result: BlueprintPrerenderCombResult = layoutService.calculateLayout(registry);
                    onLayoutUpdate(result);

                    // Calculate Content Bounds for Auto-Centering.
                    if (result.contentBounds) {
                        const { minimumX, minimumY, maximumX, maximumY }: { minimumX: number; minimumY: number; maximumX: number; maximumY: number } = result.contentBounds;
                        viewport.setContentBounds(minimumX, minimumY, maximumX, maximumY, 50);
                    }

                    onFileLoaded();
                } catch (error) {
                    console.error('Failed to load blueprint:', error);
                    alert(`Failed to load blueprint: ${(error as Error).message}`);
                }
            }
        };

        reader.readAsText(file);
        
        // Reset input value so the same file can be selected again if needed.
        event.target.value = '';
    };

    // GitHub Handlers.
    private _handleTokenChange: (event: ChangeEvent<HTMLInputElement>) => void = (event: ChangeEvent<HTMLInputElement>): void => {
        this.setState({ gitHubToken: event.target.value });
    };

    private _handleConnectGitHub: () => void = async (): Promise<void> => {
        const { gitHubToken }: FileOpenModalState = this.state;

        if (!gitHubToken) return;

        this.setState({ isLoadingRepositories: true });

        try {
            const token: string = gitHubToken.trim();
            GitHubClient.instance.token = token;
            const repositories: GitHubRepository[] = await GitHubClient.instance.getRepositories();
            
            this.setState({
                repositories: repositories,
                currentView: FileOpenModalView.REPOSITORY_SELECT,
                isLoadingRepositories: false,
                selectedRepositoryIdentifier: repositories.length > 0 ? repositories[0].id.toString() : ''
            });
        } catch (error) {
            alert(`Failed to connect: ${(error as Error).message}`);
            this.setState({ isLoadingRepositories: false });
        }
    };

    private _handleRepositoryChange: (event: ChangeEvent<HTMLSelectElement>) => void = (event: ChangeEvent<HTMLSelectElement>): void => {
        this.setState({ selectedRepositoryIdentifier: event.target.value });
    };

    private _handleCheckManifest: () => void = async (): Promise<void> => {
        const { selectedRepositoryIdentifier, repositories, availableVersions }: FileOpenModalState = this.state;

        const repository: GitHubRepository | undefined = repositories.find(
            (repositoryItem: GitHubRepository): boolean => repositoryItem.id.toString() === selectedRepositoryIdentifier
        );

        if (!repository) return;

        this.setState({ isCheckingManifest: true });

        try {
            const owner: string = repository.full_name.split('/')[0];
            const manifest: TrbManifest | null = await GitHubClient.instance.getManifest(owner, repository.name);

            if (manifest && manifest.blueprint) {
                const firstBlueprint: TrbManifestBlueprint = manifest.blueprint;
                
                // Validate that the blueprint file exists.
                const blueprintContent: string | null = await GitHubClient.instance.getFileContent(
                    owner,
                    repository.name,
                    firstBlueprint.path
                );

                // Validate that the TRB version exists.
                const versionExists: boolean = availableVersions.includes(firstBlueprint.trbVersion);

                if (blueprintContent !== null && versionExists) {
                    // Manifest is valid; load the blueprint.
                    await this._loadBlueprintFromGitHub(
                        owner,
                        repository.name,
                        firstBlueprint.path,
                        firstBlueprint.trbVersion
                    );
                } else {
                    // Manifest exists but references invalid data.
                    let errorMessage: string = 'Manifest validation failed:\n';

                    if (blueprintContent === null) {
                        errorMessage += `- Blueprint file not found: ${firstBlueprint.path}\n`;
                    }

                    if (!versionExists) {
                        errorMessage += `- TRB version not supported: ${firstBlueprint.trbVersion}`;
                    }

                    alert(errorMessage);

                    this.setState({
                        currentView: FileOpenModalView.MANIFEST_NOT_FOUND,
                        manifestBlueprintPath: firstBlueprint.path,
                        manifestTrbVersion: availableVersions.length > 0 ? availableVersions[0] : '',
                        isCheckingManifest: false
                    });
                }
            } else {
                // No manifest found - show configuration view.
                this.setState({
                    currentView: FileOpenModalView.MANIFEST_NOT_FOUND,
                    manifest: null,
                    manifestBlueprintPath: 'roadmap.trb.yaml',
                    manifestTrbVersion: availableVersions.length > 0 ? availableVersions[0] : '',
                    isCheckingManifest: false
                });
            }
        } catch (error) {
            alert(`Failed to check manifest: ${(error as Error).message}`);
            this.setState({ isCheckingManifest: false });
        }
    };

    private _handleManifestPathChange: (event: ChangeEvent<HTMLInputElement>) => void = (event: ChangeEvent<HTMLInputElement>): void => {
        this.setState({ manifestBlueprintPath: event.target.value });
    };

    private _handleManifestVersionChange: (event: ChangeEvent<HTMLSelectElement>) => void = (event: ChangeEvent<HTMLSelectElement>): void => {
        this.setState({ manifestTrbVersion: event.target.value });
    };

    private _handleCreateFromManifest: () => void = async (): Promise<void> => {
        const { selectedRepositoryIdentifier, repositories, manifestBlueprintPath, manifestTrbVersion }: FileOpenModalState = this.state;

        const repository: GitHubRepository | undefined = repositories.find(
            (repositoryItem: GitHubRepository): boolean => repositoryItem.id.toString() === selectedRepositoryIdentifier
        );

        if (!repository || !manifestBlueprintPath || !manifestTrbVersion) return;

        const owner: string = repository.full_name.split('/')[0];

        // Check if the blueprint file already exists.
        const existingContent: string | null = await GitHubClient.instance.getFileContent(
            owner,
            repository.name,
            manifestBlueprintPath
        );

        if (existingContent !== null) {
            // Load existing blueprint.
            await this._loadBlueprintFromGitHub(owner, repository.name, manifestBlueprintPath, manifestTrbVersion);
        } else {
            // Create new empty blueprint.
            await this._createNewBlueprintFromGitHub(repository.name, manifestBlueprintPath, manifestTrbVersion);
        }
    };

    private async _loadBlueprintFromGitHub(
        owner: string,
        repositoryName: string,
        filePath: string,
        trbVersion: string
    ): Promise<void> {
        const { registry, layoutService, viewport, onLayoutUpdate, onFileLoaded }: FileOpenModalProps = this.props;

        this.setState({ isLoadingFile: true });

        try {
            const content: string | null = await GitHubClient.instance.getFileContent(owner, repositoryName, filePath);

            registry.clear();

            if (content) {
                const normalizedVersion: string = trbVersion.startsWith('v') ? trbVersion : `v${trbVersion}`;
                const blueprintName: string = this._extractBlueprintNameFromPath(filePath, repositoryName);
                await BlueprintSerializer.fromYaml(content, registry, normalizedVersion, blueprintName);
            }

            const nodeHistoryTracker: NodeHistoryTracker = new NodeHistoryTracker();
            await nodeHistoryTracker.loadFromGitHub(owner, repositoryName, filePath);
            const result: BlueprintPrerenderCombResult = layoutService.calculateLayout(registry, nodeHistoryTracker.nodeTimelines);
            onLayoutUpdate(result);

            if (result.contentBounds) {
                const { minimumX, minimumY, maximumX, maximumY }: { minimumX: number; minimumY: number; maximumX: number; maximumY: number } = result.contentBounds;
                viewport.setContentBounds(minimumX, minimumY, maximumX, maximumY, 50);
            }

            onFileLoaded();
        } catch (error) {
            alert(`Failed to load blueprint: ${(error as Error).message}`);
        } finally {
            this.setState({ isLoadingFile: false });
        }
    }

    private async _createNewBlueprintFromGitHub(repositoryName: string, filePath: string, trbVersion: string): Promise<void> {
        const { registry, layoutService, onLayoutUpdate, onFileLoaded }: FileOpenModalProps = this.props;

        this.setState({ isLoadingFile: true });

        try {
            registry.clear();
            registry.blueprintName = this._extractBlueprintNameFromPath(filePath, repositoryName);

            const normalizedVersion: string = trbVersion.startsWith('v') ? trbVersion : `v${trbVersion}`;
            registry.trbVersion = normalizedVersion;

            const versionPath: string = normalizedVersion;
            const schemaUrl: string = `https://raw.githubusercontent.com/leoweyr/todo-requirement-blueprint-spec/master/schemas/${versionPath}/trb.schema.json`;
            const response: Response = await fetch(schemaUrl);

            if (response.ok) {
                registry.schema = await response.json();
            }

            const result: BlueprintPrerenderCombResult = layoutService.calculateLayout(registry);
            onLayoutUpdate(result);

            onFileLoaded();
        } catch (error) {
            alert(`Failed to create blueprint: ${(error as Error).message}`);
        } finally {
            this.setState({ isLoadingFile: false });
        }
    }

    private _extractBlueprintNameFromPath(filePath: string, fallbackName: string): string {
        const pathSegments: string[] = filePath.split('/');
        const fileNameWithExtension: string = pathSegments[pathSegments.length - 1] || fallbackName;
        const blueprintName: string = fileNameWithExtension.replace(/\.[^/.]+$/, '');

        if (blueprintName.length === 0) {
            return fallbackName;
        }

        return blueprintName;
    }

    public constructor(props: FileOpenModalProps) {
        super(props);

        this.state = {
            currentView: FileOpenModalView.INITIAL,
            newBlueprintName: 'Untitled Blueprint',
            selectedVersion: '',
            availableVersions: [],
            isLoadingVersions: false,
            gitHubToken: '',
            repositories: [],
            selectedRepositoryIdentifier: '',
            repositoryFilePath: 'roadmap.trb.yaml',
            isLoadingRepositories: false,
            isLoadingFile: false,
            manifest: null,
            isCheckingManifest: false,
            manifestBlueprintPath: 'roadmap.trb.yaml',
            manifestTrbVersion: ''
        };
    }

    public componentDidMount(): void {
        this._fetchVersions();
    }

    public render(): ReactNode {
        const { currentView }: FileOpenModalState = this.state;

        return (
            <div style={this._getContainerStyle()}>
                <h2 style={this._getTitleStyle()}>
                    {currentView === FileOpenModalView.CREATE_NEW ? 'Create New Blueprint' : 
                     currentView === FileOpenModalView.GITHUB_AUTHENTICATION ? 'Connect to GitHub' :
                     currentView === FileOpenModalView.REPOSITORY_SELECT ? 'Select Repository' :
                     currentView === FileOpenModalView.MANIFEST_NOT_FOUND ? 'Configure Blueprint' :
                     'Open Diagram'}
                </h2>
                
                {this._renderContent()}

                <input 
                    type="file" 
                    ref={this._handleInputReference}
                    style={{ display: 'none' }}
                    accept=".yaml,.json"
                    onChange={this._handleFileChange}
                />
            </div>
        );
    }

    private _renderContent(): ReactNode {
        switch (this.state.currentView) {
            case FileOpenModalView.CREATE_NEW:
                return this._renderCreateForm();
            case FileOpenModalView.GITHUB_AUTHENTICATION:
                return this._renderGitHubAuthentication();
            case FileOpenModalView.REPOSITORY_SELECT:
                return this._renderRepositorySelection();
            case FileOpenModalView.MANIFEST_NOT_FOUND:
                return this._renderManifestNotFound();
            default:
                return this._renderInitialOptions();
        }
    }

    private async _fetchVersions(): Promise<void> {
        this.setState({ isLoadingVersions: true });

        try {
            const versions: string[] = await GitHubClient.instance.getSchemaVersions();

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
        }
    }

    private _renderInitialOptions(): ReactNode {
        return (
            <>
                <p style={this._getDescriptionStyle()}>
                    Please select an action to proceed.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={this._getButtonGroupStyle()}>
                        <button 
                            style={this._getButtonStyle()}
                            onClick={this._handleButtonClick}
                        >
                            Open Local File
                        </button>
                        <button 
                            style={{...this._getButtonStyle(), backgroundColor: '#34C759'}}
                            onClick={this._handleCreateNewClick}
                        >
                            Create New
                        </button>
                    </div>
                    
                    <button 
                        style={{...this._getButtonStyle(), backgroundColor: '#24292e', margin: '0 5px'}}
                        onClick={this._handleGitHubClick}
                    >
                        Open from GitHub
                    </button>
                </div>
            </>
        );
    }

    private _renderGitHubAuthentication(): ReactNode {
        const { gitHubToken, isLoadingRepositories }: FileOpenModalState = this.state;
        
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', textAlign: 'left' }}>
                <p style={this._getDescriptionStyle()}>
                    Enter your GitHub Personal Access Token to access your repositories.
                </p>
                
                <div>
                    <label style={this._getLabelStyle()}>GitHub Token</label>
                    <input 
                        type="password" 
                        value={gitHubToken}
                        onChange={this._handleTokenChange}
                        style={this._getInputStyle()}
                        placeholder="ghp_..."
                    />
                </div>

                <div style={{...this._getButtonGroupStyle(), justifyContent: 'space-between', marginTop: '20px'}}>
                    <button 
                        style={{...this._getButtonStyle(), backgroundColor: '#8E8E93'}}
                        onClick={this._handleCancelClick}
                    >
                        Cancel
                    </button>
                    <button 
                        style={this._getButtonStyle()}
                        onClick={this._handleConnectGitHub}
                        disabled={!gitHubToken || isLoadingRepositories}
                    >
                        {isLoadingRepositories ? 'Connecting...' : 'Connect'}
                    </button>
                </div>
            </div>
        );
    }

    private _renderRepositorySelection(): ReactNode {
        const { repositories, selectedRepositoryIdentifier, isCheckingManifest }: FileOpenModalState = this.state;

        return (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', textAlign: 'left' }}>
                <p style={this._getDescriptionStyle()}>
                    Select a repository to check for TRB manifest configuration.
                </p>

                <div>
                    <label style={this._getLabelStyle()}>Repository</label>
                    <select 
                        value={selectedRepositoryIdentifier}
                        onChange={this._handleRepositoryChange}
                        style={this._getInputStyle()}
                    >
                        {repositories.map((repository: GitHubRepository): ReactNode => (
                            <option key={repository.id} value={repository.id}>{repository.full_name}</option>
                        ))}
                    </select>
                </div>

                <div style={{...this._getButtonGroupStyle(), justifyContent: 'space-between', marginTop: '20px'}}>
                    <button 
                        style={{...this._getButtonStyle(), backgroundColor: '#8E8E93'}}
                        onClick={this._handleCancelClick}
                    >
                        Cancel
                    </button>
                    <button 
                        style={this._getButtonStyle()}
                        onClick={this._handleCheckManifest}
                        disabled={!selectedRepositoryIdentifier || isCheckingManifest}
                    >
                        {isCheckingManifest ? 'Checking...' : 'Continue'}
                    </button>
                </div>
            </div>
        );
    }

    private _renderManifestNotFound(): ReactNode {
        const { manifestBlueprintPath, manifestTrbVersion, availableVersions, isLoadingVersions, isLoadingFile }: FileOpenModalState = this.state;

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', textAlign: 'left' }}>
                <p style={this._getDescriptionStyle()}>
                    No valid TRB manifest found. Please specify the blueprint path and TRB version.
                </p>

                <div>
                    <label style={this._getLabelStyle()}>Blueprint Path</label>
                    <input 
                        type="text" 
                        value={manifestBlueprintPath}
                        onChange={this._handleManifestPathChange}
                        style={this._getInputStyle()}
                        placeholder="roadmap.trb.yaml"
                    />
                </div>

                <div>
                    <label style={this._getLabelStyle()}>TRB Version</label>
                    <select 
                        value={manifestTrbVersion}
                        onChange={this._handleManifestVersionChange}
                        style={this._getInputStyle()}
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

                <div style={{...this._getButtonGroupStyle(), justifyContent: 'space-between', marginTop: '20px'}}>
                    <button 
                        style={{...this._getButtonStyle(), backgroundColor: '#8E8E93'}}
                        onClick={this._handleCancelClick}
                    >
                        Cancel
                    </button>
                    <button 
                        style={this._getButtonStyle()}
                        onClick={this._handleCreateFromManifest}
                        disabled={!manifestBlueprintPath || !manifestTrbVersion || isLoadingFile}
                    >
                        {isLoadingFile ? 'Processing...' : 'Create / Open'}
                    </button>
                </div>
            </div>
        );
    }

    private _renderCreateForm(): ReactNode {
        const { newBlueprintName, selectedVersion, availableVersions, isLoadingVersions }: FileOpenModalState = this.state;

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', textAlign: 'left' }}>
                <div>
                    <label style={this._getLabelStyle()}>Blueprint Name</label>
                    <input 
                        type="text" 
                        value={newBlueprintName}
                        onChange={this._handleNameChange}
                        style={this._getInputStyle()}
                    />
                </div>

                <div>
                    <label style={this._getLabelStyle()}>TRB Version</label>
                    <select 
                        value={selectedVersion}
                        onChange={this._handleVersionChange}
                        style={this._getInputStyle()}
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

                <div style={{...this._getButtonGroupStyle(), justifyContent: 'space-between', marginTop: '20px'}}>
                    <button 
                        style={{...this._getButtonStyle(), backgroundColor: '#8E8E93'}}
                        onClick={this._handleCancelClick}
                    >
                        Cancel
                    </button>
                    <button 
                        style={this._getButtonStyle()}
                        onClick={this._handleCreateClick}
                        disabled={!selectedVersion || !newBlueprintName}
                    >
                        Create
                    </button>
                </div>
            </div>
        );
    }

    private _getContainerStyle(): CSSProperties {
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

    private _getTitleStyle(): CSSProperties {
        return {
            margin: 0,
            fontSize: '24px',
            fontWeight: 600,
            color: '#333333'
        };
    }

    private _getDescriptionStyle(): CSSProperties {
        return {
            margin: 0,
            fontSize: '14px',
            color: '#666666',
            lineHeight: '1.5'
        };
    }

    private _getButtonGroupStyle(): CSSProperties {
        return {
            marginTop: '10px',
            display: 'flex',
            justifyContent: 'center'
        };
    }

    private _getButtonStyle(): CSSProperties {
        return {
            padding: '10px 24px',
            backgroundColor: '#007AFF',  // This color resembles the standard iOS blue.
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

    private _getLabelStyle(): CSSProperties {
        return {
            display: 'block',
            marginBottom: '5px',
            fontSize: '14px',
            fontWeight: 600,
            color: '#333333'
        };
    }

    private _getInputStyle(): CSSProperties {
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

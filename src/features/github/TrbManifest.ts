export interface TrbManifestBlueprint {
    path: string;
    trbVersion: string;
}


export interface TrbManifestInterceptor {
    path: string;
}


export interface TrbManifest {
    blueprint: TrbManifestBlueprint;
    interceptor?: TrbManifestInterceptor;
}

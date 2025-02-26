import {
	TFile,
} from "obsidian";


export class SGFile extends TFile {
	raw: string
}


export interface NPContentItem {
	args: string[],	
	content: string,
	creation_date: number,
	custom: string,
	language: string,
	modified_date: number,
	parent: number,
	post_type: string,
	position: number,
	publication: string,
	slug: string,
	status: string,
	tags: string[],
	title: string
}

export interface SGContentItem {
	args: string,
	categories?: string[],
	content: string,
	creation_date: string,
	custom?: any,
	id?: string,
	modified_date: string,
	order: number,
	parent: string,
	post_type: string,
	slug: string,
	tags: string[],
	title: string
}

export interface SGTask {
	payload?: any,
	post_type?: string,
	slug: string
}

type TuDsgDns = {
	auth_key: string,
	custodian: string,
	item_id: string,
}

type TuDsgDomain = {
	dns: TuDsgDns,
	url: string,
}

export type DSGAuthorInput = {
	content_mappings: string,
	name : string,
	repository: string,
};


type DSGCollection = {
	key: string,
	query: string,
	source: string
}

type DSGTemplate = {
	collections: DSGCollection[],
	file: string,
	path: string,
	reference: string
}

export type DSGTable = {
	gateway: string,
	id: string
}

export type NAsset = {
	path: string,
	cid: string
}

export type  DSGPublication = {
	assets: NAsset[],
	assets_gateway: string,
	contract: string,
	data_gateway: string,
	owners: string[],
	// dev_folder: string,
	domains: any[],
	mapping: DSGTemplate[],
	name: string,
	rpc: string,
	stylesheets: NAsset[],
	table: DSGTable,
	templates: string[],
	template_cid: string
}

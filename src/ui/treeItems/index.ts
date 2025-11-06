/**
 * Tree item exports
 * All tree item types used in the annotation provider sidebar
 */

import { AnnotationItem } from './annotationItem';
import { GroupCategoryItem } from './groupCategoryItem';
import { AnnotationFileItem } from './annotationFileItem';
import { AnnotationFolderItem } from './folderItem';

export { AnnotationItem } from './annotationItem';
export { GroupCategoryItem } from './groupCategoryItem';
export { AnnotationFileItem } from './annotationFileItem';
export { AnnotationFolderItem } from './folderItem';

export type TreeItem = AnnotationItem | AnnotationFileItem | GroupCategoryItem | AnnotationFolderItem;

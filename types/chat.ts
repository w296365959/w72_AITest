export interface Chat {
  id: string;
  txt: string;
  /** 发送人显示名：已登录为 displayName/username，未登录为访客标识 */
  sender_name?: string | null;
  created_at: string;
}

export interface ChatInsert {
  txt: string;
  /** 未登录时由前端传入的访客/设备标识 */
  sender_name?: string | null;
}

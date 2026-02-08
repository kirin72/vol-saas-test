/**
 * 봉사자 헤더
 * 성당 이름, 봉사자 정보, 봉사 가능 역할 표시
 */
'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { signOut } from 'next-auth/react';
import { User } from 'lucide-react';

interface VolunteerHeaderProps {
  organizationName: string;
  volunteerName: string;
  baptismalName?: string | null;
  roles: Array<{
    id: string;
    name: string;
    color: string | null;
  }>;
}

export function VolunteerHeader({
  organizationName,
  volunteerName,
  baptismalName,
  roles,
}: VolunteerHeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* 왼쪽: 성당 이름 */}
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900">
              {organizationName}
            </h1>
          </div>

          {/* 오른쪽: 봉사자 정보 + 로그아웃 */}
          <div className="flex items-center gap-4">
            {/* 봉사자 정보 */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-md">
              <User className="h-4 w-4 text-gray-600" />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-900">
                  {volunteerName}
                  {baptismalName && (
                    <span className="ml-1 text-gray-500">({baptismalName})</span>
                  )}
                </span>
                <div className="flex gap-1 mt-0.5">
                  {roles.map((role) => (
                    <Badge
                      key={role.id}
                      style={{
                        backgroundColor: role.color || '#6B7280',
                        color: 'white',
                      }}
                      className="text-xs px-1.5 py-0"
                    >
                      {role.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* 로그아웃 버튼 */}
            <Button
              onClick={() => signOut({ callbackUrl: '/auth/login' })}
              variant="outline"
              size="sm"
            >
              로그아웃
            </Button>
          </div>
        </div>

        {/* 모바일: 봉사자 정보 */}
        <div className="sm:hidden pb-3 flex items-center gap-2">
          <User className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-900">
            {volunteerName}
            {baptismalName && (
              <span className="ml-1 text-gray-500">({baptismalName})</span>
            )}
          </span>
          <div className="flex gap-1 ml-auto">
            {roles.map((role) => (
              <Badge
                key={role.id}
                style={{
                  backgroundColor: role.color || '#6B7280',
                  color: 'white',
                }}
                className="text-xs"
              >
                {role.name}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}

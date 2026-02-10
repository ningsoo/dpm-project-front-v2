import { NextRequest, NextResponse } from 'next/server';

type StatusEntry = {
  status: number;
  title: string;
  description: string;
};

const STATUS_MAP: Record<string, StatusEntry> = {
  '100': { status: 100, title: 'Continue', description: '요청을 계속 진행하세요.' },
  '200': { status: 200, title: 'OK', description: '정상적으로 처리되었습니다.' },
  '201': { status: 201, title: 'Created', description: '자원이 성공적으로 생성되었습니다.' },
  '300': { status: 300, title: 'Multiple Choice', description: '여러 응답 중 하나를 선택하세요.' },
  '400': { status: 400, title: 'Bad Request', description: '요청이 잘못되었습니다.' },
  '401': { status: 401, title: 'Unauthorized', description: '인증이 필요합니다.' },
  '402': { status: 402, title: 'Payment Required', description: '결제가 필요합니다.' },
  '403': { status: 403, title: 'Forbidden', description: '접근 권한이 없습니다.' },
  '404': { status: 404, title: 'Not Found', description: '요청한 자원을 찾을 수 없습니다.' },
  '500': {
    status: 500,
    title: 'Internal Server Error',
    description: '서버 처리 중 문제가 발생했습니다.',
  },
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const entry = STATUS_MAP[code];

    if (!entry) {
      return NextResponse.json(
        { status: 400, title: 'Unsupported Status', message: '지원하지 않는 상태 코드입니다.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { status: entry.status, title: entry.title, message: entry.description },
      { status: entry.status }
    );
  } catch (error) {
    console.error('Failed to return status response', error);

    return NextResponse.json(
      { status: 500, title: 'Internal Server Error', message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
